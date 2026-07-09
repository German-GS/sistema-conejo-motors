/// backend/src/vehicles/vehicles.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThanOrEqual, Not, Repository, DataSource } from 'typeorm';
import { Vehicle } from './vehicle.entity'; // Corregido: Ruta relativa
import { Venta } from '../ventas/venta.entity';
import { User } from '../users/user.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { PlanillaParametro } from '../planilla-parametros/entities/planilla-parametro.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto'; // Corregido: Ruta relativa
import { UpdateVehicleDto } from './dto/update-vehicle.dto'; // Corregido: Ruta relativa
import { Bodega } from '../bodegas/bodega.entity';
import { Lead } from '../leads/lead.entity';
import { VehicleProfile } from '../vehicle-profiles/vehicle-profile.entity';
import { OrdenProducto } from '../productos/orden-producto.entity';
import { VehicleEstadoHistorial } from './vehicle-estado-historial.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { Cron } from '@nestjs/schedule';

// --- 👇 DEFINE LOS NUEVOS TIPOS AQUÍ (o impórtalos si los pones en otro lado) ---
// Define un tipo que extiende Vehicle pero sobreescribe campos específicos a string[]
type TransformedVehicle = Omit<
  Vehicle,
  'seguridad' | 'interior' | 'exterior' | 'tecnologia' | 'colores_disponibles'
> & {
  seguridad: string[];
  interior: string[];
  exterior: string[];
  tecnologia: string[];
  colores_disponibles: string[];
  imagenes?: any[];
};

// Define uno para el Catálogo que también omite precio_costo
type TransformedCatalogVehicle = Omit<TransformedVehicle, 'precio_costo'>;
// --- END TYPE DEFINITIONS ---

// Función Helper para dividir strings (con logging mejorado)
const splitStringToArray = (text: string | null | undefined): string[] => {
  if (!text) return [];
  try {
    const result = text
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    // console.log(`Splitting string "${text}" resulted in:`, result); // Log opcional
    return result;
  } catch (error) {
    // Usa el Logger si está disponible, sino console.error
    const logger = new Logger('splitStringToArray');
    logger.error(`Error splitting string: "${text}"`, error);
    return []; // Devuelve array vacío en caso de error
  }
};

@Injectable()
export class VehiclesService implements OnApplicationBootstrap {
  // Logger para mensajes de servicio
  private readonly logger = new Logger(VehiclesService.name);

  /**
   * Migración de datos idempotente: los vehículos que aún tienen su estado de
   * inventario guardado en `visibilidad` (Agotado/Contrapedido) se migran a la
   * nueva columna `clasificacion_inventario` y se vuelven Visibles en la web.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const especiales = await this.vehiclesRepository.find({
        where: [{ visibilidad: 'Agotado' }, { visibilidad: 'Contrapedido' }],
      });
      if (especiales.length === 0) return;
      for (const v of especiales) {
        await this.vehiclesRepository.update(v.id, {
          clasificacion_inventario: v.visibilidad as any, // 'Agotado' | 'Contrapedido'
          visibilidad: 'Visible',
        });
      }
      this.logger.log(`[Migración] ${especiales.length} vehículo(s) migrados a clasificacion_inventario.`);
    } catch (e) {
      this.logger.error('[Migración] Error migrando clasificacion_inventario', e as any);
    }
  }

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(Cotizacion)
    private readonly cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(PlanillaParametro)
    private readonly parametrosRepository: Repository<PlanillaParametro>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(VehicleProfile)
    private readonly vehicleProfilesRepository: Repository<VehicleProfile>,
    @InjectRepository(OrdenProducto)
    private readonly ordenesRepo: Repository<OrdenProducto>,
    @InjectRepository(VehicleEstadoHistorial)
    private readonly historialRepo: Repository<VehicleEstadoHistorial>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  /** Registra una transición de estado/visibilidad/clasificación de un vehículo */
  async registrarCambioEstado(
    vehiculoId: number,
    anterior: string | undefined,
    nuevo: string,
    tipo: 'estado' | 'visibilidad' | 'clasificacion' = 'estado',
    motivo?: string,
    usuarioId?: number,
  ): Promise<void> {
    if (anterior === nuevo) return;
    try {
      const registro = this.historialRepo.create({
        vehiculo: { id: vehiculoId } as any,
        estado_anterior: anterior,
        estado_nuevo: nuevo,
        tipo,
        motivo,
        usuario: usuarioId ? ({ id: usuarioId } as any) : undefined,
      });
      await this.historialRepo.save(registro);
    } catch (e) {
      this.logger.error(`No se pudo registrar historial de estado veh #${vehiculoId}`, e as any);
    }
  }

  /** Línea de tiempo de cambios de un vehículo (más reciente primero) */
  async getHistorial(vehiculoId: number): Promise<VehicleEstadoHistorial[]> {
    return this.historialRepo.find({
      where: { vehiculo: { id: vehiculoId } },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }

  // --- Método Create ---
  // ══════════════════════════════════════════════════════════════════════════
  // CONTABILIDAD DE VEHÍCULOS (activos)
  //  - Inventario de venta      → cuenta 1300
  //  - Demo / uso interno       → cuenta 1520 (Activo Fijo) + 1525 (dep. acum.)
  //  - Contrapartida de compra  → cuenta 2100 (Cuentas por Pagar)
  //  - Contrapartida de apertura→ cuenta 3900 (Balance de Apertura)
  // ══════════════════════════════════════════════════════════════════════════
  private static readonly VIDA_UTIL_MESES_DEMO = 60; // 5 años, línea recta

  private hoyCR(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
  }

  /** Asiento de compra al ingresar el vehículo: Debe 1300 Inventario / Haber 2100 CxP. */
  async registrarCompraVehiculo(v: Vehicle, userId?: number): Promise<void> {
    const costo = Number(v.precio_costo) || 0;
    if (costo <= 0) return;
    // Idempotencia: si el vehículo ya tiene su asiento de inventario, no duplicar.
    if (await this.contabilidad.existeAsientoPorReferencia('Vehiculo', v.id)) return;

    const inv = await this.contabilidad.asegurarCuenta('1300', { nombre: 'Inventario Vehículos', tipo: 'Activo' });
    const cxp = await this.contabilidad.asegurarCuenta('2100', { nombre: 'Cuentas por Pagar', tipo: 'Pasivo' });

    // IVA de importación acreditable → cuenta de activo aparte (no capitaliza al inventario).
    const iva = Number(v.iva_importacion) || 0;

    // Desglose del landed cost (todo capitaliza a inventario 1300, pero se detalla cada componente).
    const costoFacturaCrc = +((Number(v.costo_factura_usd) || 0) * (Number(v.tipo_cambio) || 0)).toFixed(2);
    const componentes: [string, number][] = [
      ['Costo factura (FOB/CIF)', costoFacturaCrc],
      ['Tasa caldera', Number(v.tasa_caldera) || 0],
      ['Acarreo', Number(v.acarreo) || 0],
      ['Nacionalización e impuestos', Number(v.costo_nacionalizacion) || 0],
      ['Inscripción y traspaso', Number(v.inscripcion_traspaso) || 0],
      ['Marchamo', Number(v.marchamo) || 0],
    ].filter(([, val]) => (val as number) > 0) as [string, number][];

    // Aritmética en céntimos: el desglose debe sumar EXACTAMENTE el costo capitalizado.
    const costoCents = Math.round(costo * 100);
    const sumCompCents = componentes.reduce((s, [, val]) => s + Math.round(val * 100), 0);
    const restoCents = costoCents - sumCompCents;

    const debeLineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [];
    // Si el desglose no cuadra con el costo total, usamos una sola línea para garantizar la partida doble.
    if (componentes.length === 0 || sumCompCents > costoCents) {
      debeLineas.push({ cuentaId: inv.id, debe: costo, haber: 0, descripcion: `Ingreso a inventario VIN ${v.vin}` });
    } else {
      for (const [label, val] of componentes) {
        debeLineas.push({ cuentaId: inv.id, debe: Math.round(val * 100) / 100, haber: 0, descripcion: `${label} — VIN ${v.vin}` });
      }
      if (restoCents >= 1) {
        debeLineas.push({ cuentaId: inv.id, debe: restoCents / 100, haber: 0, descripcion: `Otros costos — VIN ${v.vin}` });
      }
    }

    // IVA acreditable como débito adicional; la CxP total = costo (neto) + IVA.
    if (iva > 0) {
      const ivaAcred = await this.contabilidad.asegurarCuenta('1210', { nombre: 'IVA Acreditable (Crédito Fiscal)', tipo: 'Activo' });
      debeLineas.push({ cuentaId: ivaAcred.id, debe: iva, haber: 0, descripcion: `IVA acreditable importación — VIN ${v.vin}` });
    }

    await this.contabilidad.crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
      fecha: this.hoyCR(),
      descripcion: `Compra vehículo — ${v.marca} ${v.modelo} (VIN ${v.vin})`,
      tipo: 'Compra',
      referencia_id: v.id,
      referencia_tipo: 'Vehiculo',
      lineas: [
        ...debeLineas,
        { cuentaId: cxp.id, debe: 0, haber: +(costo + iva).toFixed(2), descripcion: `Cuenta por pagar — compra VIN ${v.vin}` },
      ],
    });
  }

  /** Reclasifica un vehículo a Demo/uso interno: Activo circulante (1300) → Activo Fijo (1520). */
  async marcarDemo(id: number, userId?: number): Promise<Vehicle> {
    const v = await this.vehiclesRepository.findOneBy({ id });
    if (!v) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    if (v.estado === 'Vendido') throw new ConflictException('Un vehículo vendido no puede pasar a Demo.');
    if (v.estado === 'Demo') return v;

    const anterior = v.estado;
    const costo = Number(v.precio_costo) || 0;

    v.estado = 'Demo';
    v.fecha_demo_desde = this.hoyCR();
    v.visibilidad = 'Oculto';
    v.clasificacion_inventario = 'No Comercial';
    await this.vehiclesRepository.save(v);
    await this.registrarCambioEstado(id, anterior, 'Demo', 'estado', 'Reclasificado a Demo / uso interno', userId);

    if (costo > 0) {
      const inv = await this.contabilidad.asegurarCuenta('1300', { nombre: 'Inventario Vehículos', tipo: 'Activo' });
      const fijo = await this.contabilidad.asegurarCuenta('1520', { nombre: 'Vehículos Demo / Uso Interno', tipo: 'Activo' });
      await this.contabilidad
        .crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
          fecha: this.hoyCR(),
          descripcion: `Reclasificación a Demo — ${v.marca} ${v.modelo} (VIN ${v.vin})`,
          tipo: 'Ajuste',
          referencia_id: v.id,
          referencia_tipo: 'Vehiculo_Demo',
          lineas: [
            { cuentaId: fijo.id, debe: costo, haber: 0, descripcion: `Alta activo fijo demo VIN ${v.vin}` },
            { cuentaId: inv.id, debe: 0, haber: costo, descripcion: `Salida de inventario VIN ${v.vin}` },
          ],
        })
        .catch((e) => this.logger.warn(`[Contabilidad] Reclasif. demo #${id}: ${(e as Error).message}`));
    }
    return this.vehiclesRepository.findOneByOrFail({ id });
  }

  /** Regresa un vehículo Demo al inventario de venta, arrastrando su depreciación acumulada. */
  async quitarDemo(id: number, userId?: number): Promise<Vehicle> {
    const v = await this.vehiclesRepository.findOneBy({ id });
    if (!v) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    if (v.estado !== 'Demo') return v;

    const costo = Number(v.precio_costo) || 0;
    const acum = Number(v.depreciacion_acumulada) || 0;
    const neto = +(costo - acum).toFixed(2);

    v.estado = 'Disponible';
    v.fecha_demo_desde = null;
    v.depreciacion_acumulada = 0;
    v.visibilidad = 'Visible';
    v.clasificacion_inventario = 'En Stock';
    await this.vehiclesRepository.save(v);
    await this.registrarCambioEstado(id, 'Demo', 'Disponible', 'estado', 'Regresado a inventario de venta', userId);

    if (costo > 0) {
      const inv = await this.contabilidad.asegurarCuenta('1300', { nombre: 'Inventario Vehículos', tipo: 'Activo' });
      const fijo = await this.contabilidad.asegurarCuenta('1520', { nombre: 'Vehículos Demo / Uso Interno', tipo: 'Activo' });
      const depAcum = await this.contabilidad.asegurarCuenta('1525', { nombre: 'Depreciación Acumulada — Vehículos Demo', tipo: 'Activo' });
      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
        { cuentaId: inv.id, debe: neto, haber: 0, descripcion: `Reingreso a inventario (valor neto) VIN ${v.vin}` },
        { cuentaId: fijo.id, debe: 0, haber: costo, descripcion: `Baja activo fijo demo VIN ${v.vin}` },
      ];
      if (acum > 0) {
        lineas.splice(1, 0, { cuentaId: depAcum.id, debe: acum, haber: 0, descripcion: `Reversa depreciación acumulada VIN ${v.vin}` });
      }
      await this.contabilidad
        .crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
          fecha: this.hoyCR(),
          descripcion: `Regreso a inventario — ${v.marca} ${v.modelo} (VIN ${v.vin})`,
          tipo: 'Ajuste',
          referencia_id: v.id,
          referencia_tipo: 'Vehiculo_Demo',
          lineas,
        })
        .catch((e) => this.logger.warn(`[Contabilidad] Baja demo #${id}: ${(e as Error).message}`));
    }
    return this.vehiclesRepository.findOneByOrFail({ id });
  }

  /** Edita los datos de un vehículo demo/uso interno: placa, marchamo, vida útil y valor residual. */
  async actualizarDatosDemo(
    id: number,
    datos: { placa?: string | null; marchamo?: number; valor_residual_demo?: number; vida_util_meses_demo?: number; vida_util_fiscal_meses_demo?: number },
  ): Promise<Vehicle> {
    const v = await this.vehiclesRepository.findOneBy({ id });
    if (!v) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    if (datos.placa !== undefined) v.placa = datos.placa || null;
    if (datos.marchamo !== undefined) v.marchamo = Number(datos.marchamo) || 0;
    if (datos.valor_residual_demo !== undefined) v.valor_residual_demo = Number(datos.valor_residual_demo) || 0;
    if (datos.vida_util_meses_demo !== undefined) v.vida_util_meses_demo = Number(datos.vida_util_meses_demo) || 60;
    if (datos.vida_util_fiscal_meses_demo !== undefined) v.vida_util_fiscal_meses_demo = Number(datos.vida_util_fiscal_meses_demo) || 120;
    await this.vehiclesRepository.save(v);
    return this.vehiclesRepository.findOneByOrFail({ id });
  }

  /**
   * Carga inicial: crea el asiento de apertura para todos los vehículos en stock
   * (Disponible/Reservado → 1300, Demo → 1520) contra 3900 Balance de Apertura.
   * Idempotente: omite los que ya tengan asiento de inventario.
   */
  async cargarInventarioInicial(userId?: number): Promise<{ creados: number; omitidos: number; monto_total: number }> {
    const vehiculos = await this.vehiclesRepository.find({
      where: { estado: In(['Disponible', 'Reservado', 'Demo']) },
    });
    const inv = await this.contabilidad.asegurarCuenta('1300', { nombre: 'Inventario Vehículos', tipo: 'Activo' });
    const fijo = await this.contabilidad.asegurarCuenta('1520', { nombre: 'Vehículos Demo / Uso Interno', tipo: 'Activo' });
    const apertura = await this.contabilidad.asegurarCuenta('3900', { nombre: 'Balance de Apertura', tipo: 'Patrimonio' });

    let creados = 0, omitidos = 0, monto_total = 0;
    for (const v of vehiculos) {
      const costo = Number(v.precio_costo) || 0;
      if (costo <= 0) { omitidos++; continue; }
      if (await this.contabilidad.existeAsientoPorReferencia('Vehiculo', v.id)) { omitidos++; continue; }
      const activo = v.estado === 'Demo' ? fijo : inv;
      await this.contabilidad.crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
        fecha: this.hoyCR(),
        descripcion: `Carga inicial de inventario — ${v.marca} ${v.modelo} (VIN ${v.vin})`,
        tipo: 'Ajuste',
        referencia_id: v.id,
        referencia_tipo: 'Vehiculo',
        lineas: [
          { cuentaId: activo.id, debe: costo, haber: 0, descripcion: `Saldo inicial VIN ${v.vin}` },
          { cuentaId: apertura.id, debe: 0, haber: costo, descripcion: `Contrapartida apertura VIN ${v.vin}` },
        ],
      });
      creados++; monto_total += costo;
    }
    return { creados, omitidos, monto_total: +monto_total.toFixed(2) };
  }

  /** Depreciación mensual (línea recta, 5 años) de los vehículos Demo. Día 1 de cada mes. */
  @Cron('0 6 1 * *')
  async depreciarVehiculosDemo(): Promise<void> {
    const demos = await this.vehiclesRepository.find({ where: { estado: 'Demo' } });
    if (!demos.length) return;

    const gasto = await this.contabilidad.asegurarCuenta('5450', { nombre: 'Gasto por Depreciación', tipo: 'Gasto' });
    const depAcum = await this.contabilidad.asegurarCuenta('1525', { nombre: 'Depreciación Acumulada — Vehículos Demo', tipo: 'Activo' });

    for (const v of demos) {
      const costo = Number(v.precio_costo) || 0;
      if (costo <= 0) continue;
      // Base depreciable = costo − valor residual (misma fórmula que activos-fijos genéricos).
      const residual = Number(v.valor_residual_demo) || 0;
      const base = costo - residual;
      if (base <= 0) continue;
      const vidaUtil = Number(v.vida_util_meses_demo) || VehiclesService.VIDA_UTIL_MESES_DEMO;
      const acum = Number(v.depreciacion_acumulada) || 0;
      if (acum >= base) continue; // totalmente depreciado hasta el valor residual
      const cuota = Math.min(+(base / vidaUtil).toFixed(2), +(base - acum).toFixed(2));
      if (cuota <= 0) continue;

      await this.contabilidad
        .crearAsiento(undefined as any, {
          fecha: this.hoyCR(),
          descripcion: `Depreciación mensual — ${v.marca} ${v.modelo} (VIN ${v.vin})`,
          tipo: 'Ajuste',
          referencia_id: v.id,
          referencia_tipo: 'Depreciacion_Demo',
          lineas: [
            { cuentaId: gasto.id, debe: cuota, haber: 0, descripcion: `Depreciación VIN ${v.vin}` },
            { cuentaId: depAcum.id, debe: 0, haber: cuota, descripcion: `Dep. acumulada VIN ${v.vin}` },
          ],
        })
        .then(async () => {
          v.depreciacion_acumulada = +(acum + cuota).toFixed(2);
          await this.vehiclesRepository.save(v);
        })
        .catch((e) => this.logger.warn(`[Contabilidad] Depreciación demo #${v.id}: ${(e as Error).message}`));
    }
  }

  /**
   * Depreciación FISCAL de los vehículos demo (Anexo 2: 10 años). Carril paralelo,
   * base = costo total (sin residual), NO genera asiento. Día 1, 06:25 UTC.
   */
  @Cron('0 7 1 * *')
  async depreciarFiscalVehiculosDemo(): Promise<void> {
    const demos = await this.vehiclesRepository.find({ where: { estado: 'Demo' } });
    const periodo = this.hoyCR().slice(0, 7);
    for (const v of demos) {
      if (v.ultimo_periodo_fiscal_demo === periodo) continue;
      const base = Number(v.precio_costo) || 0;
      if (base <= 0) continue;
      const vida = Number(v.vida_util_fiscal_meses_demo) || 120;
      const acum = Number(v.depreciacion_fiscal_acumulada_demo) || 0;
      if (acum >= base) { v.ultimo_periodo_fiscal_demo = periodo; await this.vehiclesRepository.save(v); continue; }
      const cuota = Math.min(+(base / vida).toFixed(2), +(base - acum).toFixed(2));
      v.depreciacion_fiscal_acumulada_demo = +(acum + cuota).toFixed(2);
      v.ultimo_periodo_fiscal_demo = periodo;
      await this.vehiclesRepository.save(v);
    }
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    this.logger.log(
      `Attempting to create vehicle with DTO: ${JSON.stringify(
        createVehicleDto,
      )}`,
    );
    const { profileId, bodegaId, ...instanceData } = createVehicleDto;

    if (!profileId) {
      this.logger.error('Create failed: Profile ID is required.');
      throw new ConflictException(
        'Se debe seleccionar un perfil para crear el vehículo.',
      );
    }

    const vehicleProfile = await this.vehicleProfilesRepository.findOneBy({
      id: profileId,
    });
    if (!vehicleProfile) {
      this.logger.error(
        `Create failed: Profile with ID #${profileId} not found.`,
      );
      throw new NotFoundException(`Perfil con ID #${profileId} no encontrado.`);
    }
    this.logger.log(
      `Found profile: ${vehicleProfile.marca} ${vehicleProfile.modelo}`,
    );

    // Excluye ID e imágenes del objeto a copiar
    const { id: _pId, imagenes: _pImgs, ...profileDataToCopy } = vehicleProfile;

    // Procesa campos numéricos y de instancia
    const numericFields: (
      | keyof typeof instanceData
      | keyof typeof profileDataToCopy
    )[] = [
      'año',
      'precio_costo',
      'precio_venta',
      'potencia_hp',
      'torque_nm',
      'aceleracion_0_100',
      'velocidad_maxima',
      'autonomia_km',
      'capacidad_bateria_kwh',
      'tiempo_carga_dc',
      'tiempo_carga_ac',
      'largo_mm',
      'ancho_mm',
      'alto_mm',
      'distancia_ejes_mm',
      'peso_kg',
      'capacidad_maletero_l',
      'numero_pasajeros',
    ];
    const finalVehicleData: Partial<Vehicle> = { ...instanceData };

    for (const field of numericFields) {
      const key = field as keyof Vehicle; // Aseguramos el tipo
      if (
        finalVehicleData[key] === '' ||
        finalVehicleData[key] === undefined ||
        finalVehicleData[key] === null
      ) {
        (finalVehicleData as any)[key] = null;
        this.logger.verbose(`Field ${String(key)} normalized to null`);
      } else {
        const numValue = Number(finalVehicleData[key]);
        if (isNaN(numValue)) {
          this.logger.warn(
            `Value for ${String(
              key,
            )} ("${finalVehicleData[key]}") is not a valid number. Setting to null.`,
          );
          (finalVehicleData as any)[key] = null;
        } else {
          (finalVehicleData as any)[key] = numValue;
        }
      }
    }

    for (const key in profileDataToCopy) {
      if (
        !(key in finalVehicleData) ||
        finalVehicleData[key as keyof Vehicle] === null ||
        finalVehicleData[key as keyof Vehicle] === undefined
      ) {
        (finalVehicleData as any)[key] = (profileDataToCopy as any)[key];
      }
    }

    // Asigna las relaciones
    finalVehicleData.profile = vehicleProfile;
    finalVehicleData.bodega = bodegaId
      ? ({ id: bodegaId } as Bodega)
      : undefined;

    this.logger.log(
      `Final data for vehicle creation: ${JSON.stringify(finalVehicleData)}`,
    );

    // Asegúrate de que create acepta Partial<Vehicle> o ajusta el tipo
    const newVehicle = this.vehiclesRepository.create(
      finalVehicleData as Vehicle,
    );

    try {
      const savedVehicle = await this.vehiclesRepository.save(newVehicle);
      this.logger.log(
        `Vehicle created successfully with ID: ${savedVehicle.id}`,
      );

      // Asiento de compra automático: Debe 1300 Inventario / Haber 2100 CxP.
      // No bloquea la creación del vehículo si la contabilidad falla.
      await this.registrarCompraVehiculo(savedVehicle).catch((e) =>
        this.logger.warn(
          `[Contabilidad] No se pudo registrar la compra del vehículo #${savedVehicle.id}: ${(e as Error).message}`,
        ),
      );
      // Recarga explícita para asegurar relaciones
      return await this.vehiclesRepository.findOneOrFail({
        where: { id: savedVehicle.id },
        relations: {
          profile: { imagenes: true },
          bodega: true,
        },
        order: { profile: { imagenes: { order: 'ASC' } } },
      });
    } catch (error: any) {
      if (error?.code === '23505' && error.detail?.includes('vin')) {
        this.logger.error(
          `Create failed: Duplicate VIN "${finalVehicleData.vin}".`,
        );
        throw new ConflictException('Ya existe un vehículo con este VIN.');
      }
      this.logger.error(`Create failed: Database error`, error.stack);
      throw new InternalServerErrorException('No se pudo crear el vehículo.');
    }
  }

  // --- Método findOne ---
  // --- 👇 Update return type ---
  async findOne(id: number): Promise<TransformedVehicle> {
    this.logger.log(`findOne: Attempting to find vehicle with ID: ${id}`);
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: {
        bodega: true,
        profile: {
          imagenes: true,
        },
      },
      order: { profile: { imagenes: { order: 'ASC' } } },
    });

    if (!vehicle) {
      this.logger.error(`findOne: Vehicle with ID #${id} not found.`);
      throw new NotFoundException(`Vehículo con ID #${id} no encontrado.`);
    }

    this.logger.log(
      `findOne: Vehicle ID #${id} found (before transform). Profile loaded: ${!!vehicle.profile}, Profile Images loaded: ${!!vehicle.profile
        ?.imagenes}, Image count: ${vehicle.profile?.imagenes?.length ?? 'N/A'}`,
    );
 
    try {
      const p = vehicle.profile;
      const transformedVehicle: TransformedVehicle = {
        ...vehicle,
        imagenes: p?.imagenes ?? [],
        potencia_hp:           vehicle.potencia_hp           ?? p?.potencia_hp           ?? null,
        torque_nm:             vehicle.torque_nm             ?? p?.torque_nm             ?? null,
        aceleracion_0_100:     vehicle.aceleracion_0_100     ?? p?.aceleracion_0_100     ?? null,
        velocidad_maxima:      vehicle.velocidad_maxima      ?? p?.velocidad_maxima      ?? null,
        autonomia_km:          vehicle.autonomia_km          ?? p?.autonomia_km          ?? null,
        capacidad_bateria_kwh: vehicle.capacidad_bateria_kwh ?? p?.capacidad_bateria_kwh ?? null,
        numero_pasajeros:      vehicle.numero_pasajeros      ?? p?.numero_pasajeros      ?? null,
        largo_mm:              vehicle.largo_mm              ?? p?.largo_mm              ?? null,
        ancho_mm:              vehicle.ancho_mm              ?? p?.ancho_mm              ?? null,
        alto_mm:               vehicle.alto_mm               ?? p?.alto_mm               ?? null,
        peso_kg:               vehicle.peso_kg               ?? p?.peso_kg               ?? null,
        capacidad_maletero_l:  vehicle.capacidad_maletero_l  ?? p?.capacidad_maletero_l  ?? null,
        categoria:             vehicle.categoria             ?? p?.categoria             ?? null,
        traccion:              vehicle.traccion              ?? p?.traccion              ?? null,
        seguridad:        splitStringToArray(vehicle.seguridad        || p?.seguridad),
        interior:         splitStringToArray(vehicle.interior         || p?.interior),
        exterior:         splitStringToArray(vehicle.exterior         || p?.exterior),
        tecnologia:       splitStringToArray(vehicle.tecnologia       || p?.tecnologia),
        colores_disponibles: splitStringToArray(vehicle.colores_disponibles || p?.colores_disponibles),
      };
      this.logger.log(`findOne: Vehicle ID #${id} transformed successfully.`);
      // ... (debug logs for specific fields if needed) ...
      return transformedVehicle;
    } catch (error) {
      this.logger.error(`findOne: Error transforming vehicle ID ${id}`, error);
      throw new InternalServerErrorException(
        `Error procesando datos del vehículo ID ${id}`,
      );
    }
  }

  
  async findAll(): Promise<TransformedVehicle[]> {
    this.logger.log('findAll: Attempting to find all vehicles...');
    const vehicles = await this.vehiclesRepository.find({
      relations: {
        bodega: true,
        profile: {
          imagenes: true,
        },
      },
      order: {
        id: 'ASC',
        profile: { imagenes: { order: 'ASC' } },
      },
    });
    this.logger.log(
      `findAll: Found ${vehicles.length} vehicles (before transform).`,
    );

    return vehicles.map((vehicle) => {
      // this.logger.debug(`findAll: Transforming vehicle ID: ${vehicle.id}`);
      try {
        // --- 👇 Ensure the returned object matches TransformedVehicle ---
        const transformed: TransformedVehicle = {
          ...vehicle,
          imagenes: vehicle.profile?.imagenes ?? [],
          seguridad: splitStringToArray(vehicle.seguridad),
          interior: splitStringToArray(vehicle.interior),
          exterior: splitStringToArray(vehicle.exterior),
          tecnologia: splitStringToArray(vehicle.tecnologia),
          colores_disponibles: splitStringToArray(vehicle.colores_disponibles),
        };
        return transformed; // Coincide con TransformedVehicle[]
      } catch (error) {
        this.logger.error(
          `findAll: Error transforming vehicle ID ${vehicle.id}`,
          error,
        );
       
        throw new InternalServerErrorException(
          `Error procesando datos del vehículo ID ${vehicle.id} en la lista.`,
        );
        // return vehicle as any; // Alternativa menos segura
      }
    });
  }

  async findCatalog(): Promise<TransformedCatalogVehicle[]> {
    this.logger.log(
      'findCatalog: Attempting to find available vehicles for catalog...',
    );
    const vehicles = await this.vehiclesRepository.find({
      // El catálogo muestra todo lo Visible (la clasificación Agotado/Contrapedido
      // solo cambia el cintillo, no oculta el vehículo)
      where: { estado: 'Disponible', visibilidad: 'Visible' },
      relations: {
        bodega: true,
        profile: {
          imagenes: true,
        },
      },
      order: { profile: { imagenes: { order: 'ASC' } } },
    });
    this.logger.log(
      `findCatalog: Found ${vehicles.length} available vehicles (before transform).`,
    );

    return vehicles.map(({ precio_costo, ...vehicle }) => {

      try {
     
        const p = vehicle.profile; // shorthand
        const transformed: TransformedCatalogVehicle = {
          ...vehicle,
          // Specs técnicos: usar los del vehículo si existen, sino los del perfil
          potencia_hp:            vehicle.potencia_hp            ?? p?.potencia_hp            ?? null,
          torque_nm:              vehicle.torque_nm              ?? p?.torque_nm              ?? null,
          aceleracion_0_100:      vehicle.aceleracion_0_100      ?? p?.aceleracion_0_100      ?? null,
          velocidad_maxima:       vehicle.velocidad_maxima       ?? p?.velocidad_maxima       ?? null,
          autonomia_km:           vehicle.autonomia_km           ?? p?.autonomia_km           ?? null,
          capacidad_bateria_kwh:  vehicle.capacidad_bateria_kwh  ?? p?.capacidad_bateria_kwh  ?? null,
          numero_pasajeros:       vehicle.numero_pasajeros       ?? p?.numero_pasajeros       ?? null,
          largo_mm:               vehicle.largo_mm               ?? p?.largo_mm               ?? null,
          ancho_mm:               vehicle.ancho_mm               ?? p?.ancho_mm               ?? null,
          alto_mm:                vehicle.alto_mm                ?? p?.alto_mm                ?? null,
          peso_kg:                vehicle.peso_kg                ?? p?.peso_kg                ?? null,
          capacidad_maletero_l:   vehicle.capacidad_maletero_l   ?? p?.capacidad_maletero_l   ?? null,
          categoria:              vehicle.categoria              ?? p?.categoria              ?? null,
          traccion:               vehicle.traccion               ?? p?.traccion               ?? null,
          imagenes: vehicle.profile?.imagenes ?? [],
          seguridad: splitStringToArray(vehicle.seguridad || p?.seguridad),
          interior:  splitStringToArray(vehicle.interior  || p?.interior),
          exterior:  splitStringToArray(vehicle.exterior  || p?.exterior),
          tecnologia:splitStringToArray(vehicle.tecnologia|| p?.tecnologia),
          colores_disponibles: splitStringToArray(vehicle.colores_disponibles || p?.colores_disponibles),
        };
        return transformed; // Coincide con TransformedCatalogVehicle[]
      } catch (error) {
        this.logger.error(
          `findCatalog: Error transforming vehicle ID ${vehicle.id}`,
          error,
        );
        // Manejo de error
        throw new InternalServerErrorException(
          `Error procesando datos del catálogo para el vehículo ID ${vehicle.id}.`,
        );
     
      }
    });
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<TransformedVehicle> {
    this.logger.log(
      `Attempting to update vehicle ID: ${id} with DTO: ${JSON.stringify(
        updateVehicleDto,
      )}`,
    );
    const { bodegaId, profileId, marca, modelo, ...vehicleInstanceData } =
      updateVehicleDto;

    // Procesa campos numéricos
    const numericFields: (keyof typeof vehicleInstanceData)[] = [
      'año',
      'precio_costo',
      'precio_venta' /* ...otros campos numéricos actualizables...*/,
    ];
    for (const field of numericFields) {
      const key = field as keyof Vehicle; // Aseguramos el tipo
      if (
        (vehicleInstanceData as any)[key] === '' ||
        (vehicleInstanceData as any)[key] === undefined ||
        (vehicleInstanceData as any)[key] === null
      ) {
        (vehicleInstanceData as any)[key] = null;
      } else if ((vehicleInstanceData as any)[key] !== null) {
        const numValue = Number((vehicleInstanceData as any)[key]);
        if (isNaN(numValue)) {
          this.logger.warn(
            `Update: Value for ${String(
              key,
            )} ("${(vehicleInstanceData as any)[key]}") is not a valid number. Setting to null.`,
          );
          (vehicleInstanceData as any)[key] = null;
        } else {
          (vehicleInstanceData as any)[key] = numValue;
        }
      }
    }

    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...vehicleInstanceData,
    });

    if (!vehicle) {
      this.logger.error(`Update failed: Vehicle with ID #${id} not found.`);
      throw new NotFoundException(`Vehículo con ID #${id} no encontrado`);
    }

    if (bodegaId !== undefined) {
      this.logger.log(
        `Updating bodega for vehicle ID ${id} to ${bodegaId === null ? 'null' : bodegaId}`,
      );
      vehicle.bodega = bodegaId ? ({ id: bodegaId } as Bodega) : null;
    }

    try {
      await this.vehiclesRepository.save(vehicle);
      this.logger.log(`Vehicle ID #${id} updated successfully.`);
      // Llama a this.findOne(id) que ya devuelve Promise<TransformedVehicle>
      const updatedVehicle = await this.findOne(id);
      // --- 👇 REMOVE the unsafe cast 'as Vehicle' ---
      return updatedVehicle; // Now the return type matches the method signature
    } catch (error: any) {
      if (error?.code === '23505' && error.detail?.includes('vin')) {
        this.logger.error(
          `Update failed: Duplicate VIN constraint violation for ID ${id}.`,
        );
        throw new ConflictException('Error de VIN duplicado al actualizar.');
      }
      this.logger.error(
        `Update failed: Database error for ID ${id}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `No se pudo actualizar el vehículo ID ${id}.`,
      );
    }
  }

  // --- Método remove ---
  async remove(id: number): Promise<void> {
    this.logger.log(`Attempting to remove vehicle ID: ${id}`);
    const result = await this.vehiclesRepository.delete(id);

    if (result.affected === 0) {
      this.logger.error(`Remove failed: Vehicle with ID #${id} not found.`);
      throw new NotFoundException(`Vehículo con ID #${id} no encontrado.`);
    }
    this.logger.log(`Vehicle ID #${id} removed successfully.`);
  }

  async updateVisibility(id: number, visibilidad: 'Visible' | 'Oculto' | 'Agotado' | 'Contrapedido') {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });
    if (!vehicle) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    const anterior = vehicle.visibilidad;
    vehicle.visibilidad = visibilidad;
    const saved = await this.vehiclesRepository.save(vehicle);
    await this.registrarCambioEstado(id, anterior, visibilidad, 'visibilidad');
    return saved;
  }

  async updateClasificacion(
    id: number,
    clasificacion: 'En Stock' | 'Agotado' | 'Contrapedido' | 'No Comercial',
  ) {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });
    if (!vehicle) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    const anterior = vehicle.clasificacion_inventario;
    vehicle.clasificacion_inventario = clasificacion;
    const saved = await this.vehiclesRepository.save(vehicle);
    await this.registrarCambioEstado(id, anterior, clasificacion, 'clasificacion');
    return saved;
  }

  async updatePricing(id: number, data: { precio_venta?: number; precio_venta_usd?: number; descuento_porcentaje?: number }) {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });
    if (!vehicle) throw new NotFoundException(`Vehículo #${id} no encontrado.`);

    if (data.precio_venta !== undefined) vehicle.precio_venta = data.precio_venta;
    if (data.precio_venta_usd !== undefined) vehicle.precio_venta_usd = data.precio_venta_usd;
    if (data.descuento_porcentaje !== undefined) vehicle.descuento_porcentaje = data.descuento_porcentaje;

    // Calcular precio final con descuento
    const descuento = Number(vehicle.descuento_porcentaje ?? 0);
    vehicle.precio_venta_final = Number(vehicle.precio_venta) * (1 - descuento / 100);

    // Alerta si precio final < costo
    const precioCosto = Number(vehicle.precio_costo);
    const alerta = vehicle.precio_venta_final < precioCosto;
    if (alerta) {
      this.logger.warn(`⚠️ Vehículo #${id}: precio de venta (${vehicle.precio_venta_final}) INFERIOR al costo (${precioCosto})`);
    }

    const saved = await this.vehiclesRepository.save(vehicle);
    return { ...saved, alerta_precio_bajo: alerta };
  }

  // --- Métodos de Dashboard ---
  async getDashboardStats(): Promise<any> {
    // Podrías definir una interfaz para el retorno
    this.logger.log('getDashboardStats: Fetching general dashboard stats...');
    try {
      const vehiclesInStock = await this.vehiclesRepository.find({
        where: { estado: 'Disponible', clasificacion_inventario: 'En Stock' },
        relations: { profile: true, bodega: true }, // Carga básica suficiente
      });
      const totalVehicles = vehiclesInStock.length;
      const inventoryCost = vehiclesInStock.reduce(
        (sum, v) => sum + Number(v.precio_costo || 0),
        0,
      );
      this.logger.debug(
        `Dashboard Stats: ${totalVehicles} vehicles in stock, cost ${inventoryCost}`,
      );

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const monthlySalesData = await this.ventasRepository.find({
        where: { fecha_venta: MoreThanOrEqual(startOfMonth) },
        relations: ['cotizacion', 'cotizacion.vehiculo'], // Necesitamos vehiculo.precio_costo
      });

      const monthlySales = monthlySalesData.length;
      const monthlyRevenue = monthlySalesData.reduce(
        (sum, venta) => sum + Number((venta as any).total_con_iva || venta.monto_final || 0),
        0,
      );
      const monthlyCostOfGoodsSold = monthlySalesData.reduce(
        (sum, venta) =>
          sum + Number(venta.cotizacion?.vehiculo?.precio_costo || 0),
        0,
      );
      const monthlyGrossProfit = monthlyRevenue - monthlyCostOfGoodsSold;
      this.logger.debug(
        `Dashboard Stats: Monthly Sales=${monthlySales}, Revenue=${monthlyRevenue}, COGS=${monthlyCostOfGoodsSold}, Profit=${monthlyGrossProfit}`,
      );

      const salesBySellerData = await this.ventasRepository
        .createQueryBuilder('venta')
        .leftJoin('venta.vendedor', 'vendedor')
        .select('vendedor.nombre_completo', 'name')
        .addSelect('COUNT(venta.id)', 'ventas')
        .where('venta.fecha_venta >= :startOfMonth', {
          startOfMonth: startOfMonth.toISOString().split('T')[0],
        })
        .groupBy('vendedor.nombre_completo')
        .orderBy('"ventas"', 'DESC')
        .getRawMany();
      this.logger.debug(
        `Dashboard Stats: Sales by seller data count: ${salesBySellerData.length}`,
      );

      const salesData: { month: string; vendidos: number }[] = [];
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        const firstDayString = firstDay.toISOString().split('T')[0];
        const lastDayString = lastDay.toISOString().split('T')[0];

        const salesInMonth = await this.ventasRepository.count({
          where: {
            fecha_venta: Between(firstDayString as any, lastDayString as any),
          },
        });
        salesData.push({
          month: monthNames[monthIndex],
          vendidos: salesInMonth,
        });
      }
      this.logger.debug(
        `Dashboard Stats: Historical sales data generated for ${salesData.length} months.`,
      );

      return {
        totalVehicles,
        inventoryCost,
        monthlySales,
        monthlyRevenue,
        salesData,
        monthlyGrossProfit,
        salesBySellerData,
      };
    } catch (error) {
      this.logger.error(
        'getDashboardStats: Failed to fetch dashboard stats',
        error,
      );
      throw new InternalServerErrorException(
        'Error al obtener estadísticas del dashboard.',
      );
    }
  }

  /** Admin: libera un vehículo Reservado → vuelve a Disponible y cancela la cotización activa */
  async liberarVehiculo(id: number): Promise<{ ok: boolean; message: string }> {
    const vehiculo = await this.vehiclesRepository.findOneBy({ id });
    if (!vehiculo) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    if (vehiculo.estado !== 'Reservado') {
      return { ok: false, message: `El vehículo ya está en estado "${vehiculo.estado}".` };
    }

    // Liberar vehículo
    await this.vehiclesRepository.update(id, { estado: 'Disponible' });
    await this.registrarCambioEstado(id, 'Reservado', 'Disponible', 'estado', 'Liberación manual de reserva');

    // Cancelar cotizaciones activas asociadas a este vehículo
    await this.cotizacionesRepository
      .createQueryBuilder()
      .update()
      .set({ estado: 'Cancelada' })
      .where('vehiculoId = :id', { id })
      .andWhere("estado IN ('Borrador', 'Enviada')")
      .execute();

    return { ok: true, message: `Vehículo #${id} liberado y cotización cancelada.` };
  }

  /** Admin: vehículos Reservados con su cotización activa más reciente */
  async getReservados(): Promise<any[]> {
    const vehiculos = await this.vehiclesRepository.find({
      where: { estado: 'Reservado' },
      relations: ['profile'],
      order: { id: 'DESC' },
    });

    // Para cada vehículo, buscar la cotización activa más reciente
    const result = await Promise.all(vehiculos.map(async (v) => {
      const cot = await this.cotizacionesRepository.findOne({
        where: { vehiculo: { id: v.id } },
        relations: ['cliente', 'vendedor'],
        order: { fecha_creacion: 'DESC' },
      });
      return {
        id: v.id,
        marca: v.marca,
        modelo: v.modelo,
        año: v.año,
        color: v.color,
        imagen: (v as any).profile?.imagen_principal ?? null,
        cotizacion: cot ? {
          id: cot.id,
          cliente: cot.cliente?.nombre_completo ?? '—',
          vendedor: (cot as any).vendedor?.nombre_completo ?? '—',
          fecha_creacion: cot.fecha_creacion,
          fecha_expiracion: cot.fecha_expiracion,
          estado: cot.estado,
        } : null,
      };
    }));

    return result;
  }

  /** Dashboard admin extendido: KPIs de leads, cotizaciones, inventario */
  async getAdminDashboardExtended(): Promise<any> {
    // Costa Rica timezone offset
    const offset = -6 * 60;
    const ahora  = new Date();
    const crNow  = new Date(ahora.getTime() + (offset - ahora.getTimezoneOffset()) * 60000);
    const startOfMonth = new Date(crNow.getFullYear(), crNow.getMonth(), 1);
    const hoyInicio    = new Date(crNow); hoyInicio.setHours(0, 0, 0, 0);

    // ── Vehículos ─────────────────────────────────────────────────────────────
    const [disponibles, reservados, vendidosMes] = await Promise.all([
      // Agotado = sin stock físico → no cuenta como disponible en el dashboard
      this.vehiclesRepository.count({ where: { estado: 'Disponible', clasificacion_inventario: 'En Stock' } }),
      this.vehiclesRepository.count({ where: { estado: 'Reservado' } }),
      this.ventasRepository.count({ where: { fecha_venta: MoreThanOrEqual(startOfMonth) } }),
    ]);

    // Ingresos vehículos este mes (total_con_iva o monto_final como fallback)
    const ventasMes = await this.ventasRepository.find({
      where: { fecha_venta: MoreThanOrEqual(startOfMonth) },
      select: ['monto_final', 'iva_monto', 'total_con_iva'],
    });
    const ingresosVehiculosMes = ventasMes.reduce(
      (s, v) => s + Number(v.total_con_iva || v.monto_final || 0), 0,
    );

    // ── Leads — usando QueryBuilder raw para evitar problemas de cast con enum PostgreSQL ──
    const leadsActivos = await this.leadRepository
      .createQueryBuilder('l')
      .where("l.estado::text IN ('Nuevo','Contactado','En Progreso','Prueba de Manejo','Cotizacion Enviada','Negociacion')")
      .getCount();
    const leadsCerradosMes = await this.leadRepository
      .createQueryBuilder('l')
      .where("l.estado::text = 'Cerrado'")
      .andWhere('l.fecha_creacion >= :start', { start: startOfMonth })
      .getCount();
    const leadsPerdidosMes = await this.leadRepository
      .createQueryBuilder('l')
      .where("l.estado::text = 'Perdido'")
      .andWhere('l.fecha_creacion >= :start', { start: startOfMonth })
      .getCount();
    const leadsHoy = await this.leadRepository.count({
      where: { fecha_creacion: MoreThanOrEqual(hoyInicio) },
    });

    // ── Cotizaciones ──────────────────────────────────────────────────────────
    const cotizacionesActivas = await this.cotizacionesRepository.count({
      where: [{ estado: 'Borrador' }, { estado: 'Enviada' }],
    });
    const cotizacionesVencidas = await this.cotizacionesRepository
      .createQueryBuilder('c')
      .where('c.fecha_expiracion < :hoy', { hoy: crNow })
      .andWhere("c.estado IN ('Borrador','Enviada')")
      .getCount();
    const cotizacionesMes = await this.cotizacionesRepository.count({
      where: { fecha_creacion: MoreThanOrEqual(startOfMonth) },
    });

    // ── Repuestos / Accesorios ────────────────────────────────────────────────
    const ordenesMes = await this.ordenesRepo.find({
      where: { estado: 'Completada', fecha_creacion: MoreThanOrEqual(startOfMonth) },
      select: ['total'],
    });
    const repuestosVentasMes  = ordenesMes.length;
    const repuestosIngresosMes = ordenesMes.reduce((s, o) => s + Number(o.total || 0), 0);

    // ── Top vendedores (por ventas de vehículos cerradas este mes) ────────────
    const topVendedores = await this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.vendedor', 'v')
      .select('v.nombre_completo', 'nombre')
      .addSelect('COUNT(venta.id)', 'total')
      .addSelect('SUM(COALESCE(venta.total_con_iva, venta.monto_final))', 'ingresos')
      .where('venta.fecha_venta >= :inicio', { inicio: startOfMonth })
      .groupBy('v.nombre_completo')
      .orderBy('COUNT(venta.id)', 'DESC')
      .limit(5)
      .getRawMany();

    // ── Historial de ventas 6 meses (vehículos + repuestos) ──────────────────
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const salesData: { month: string; vehiculos: number; repuestos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(crNow.getFullYear(), crNow.getMonth() - i, 1);
      const ini = new Date(d.getFullYear(), d.getMonth(), 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [veh, rep] = await Promise.all([
        this.ventasRepository.count({ where: { fecha_venta: Between(ini, fin) } }),
        this.ordenesRepo.count({ where: { estado: 'Completada', fecha_creacion: Between(ini, fin) } }),
      ]);
      salesData.push({ month: monthNames[d.getMonth()], vehiculos: veh, repuestos: rep });
    }

    // ── Conversión cotización → venta por vendedor (mes actual) ──────────────
    const cotizPorVendedorRaw = await this.cotizacionesRepository
      .createQueryBuilder('c')
      .leftJoin('c.vendedor', 'v')
      .select('v.nombre_completo', 'nombre')
      .addSelect('COUNT(c.id)', 'cotizaciones')
      .where('c.fecha_creacion >= :inicio', { inicio: startOfMonth })
      .groupBy('v.nombre_completo')
      .getRawMany();
    const ventasPorVendedorRaw = await this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.vendedor', 'v')
      .select('v.nombre_completo', 'nombre')
      .addSelect('COUNT(venta.id)', 'ventas')
      .where('venta.fecha_venta >= :inicio', { inicio: startOfMonth })
      .groupBy('v.nombre_completo')
      .getRawMany();
    const ventasMap = new Map<string, number>();
    ventasPorVendedorRaw.forEach((r) => ventasMap.set(r.nombre, Number(r.ventas)));
    const conversionVendedores = cotizPorVendedorRaw
      .filter((r) => r.nombre)
      .map((r) => {
        const cotz = Number(r.cotizaciones);
        const vts = ventasMap.get(r.nombre) ?? 0;
        return {
          nombre: r.nombre,
          cotizaciones: cotz,
          ventas: vts,
          conversion: cotz > 0 ? Math.round((vts / cotz) * 100) : 0,
        };
      })
      .sort((a, b) => b.conversion - a.conversion);

    return {
      inventario: { disponibles, reservados, vendidosMes, ingresosVehiculosMes },
      leads: { activos: leadsActivos, cerradosMes: leadsCerradosMes, perdidosMes: leadsPerdidosMes, hoy: leadsHoy },
      cotizaciones: { activas: cotizacionesActivas, vencidas: cotizacionesVencidas, mes: cotizacionesMes },
      repuestos: { ventasMes: repuestosVentasMes, ingresosMes: repuestosIngresosMes },
      topVendedores,
      conversionVendedores,
      salesData,
    };
  }

  async getSalespersonDashboardStats(user: User): Promise<any> {
    // Podrías definir una interfaz para el retorno
    this.logger.log(
      `getSalespersonDashboardStats: Fetching stats for user ID: ${user.id}`,
    );
    try {
      const totalVehicles = await this.vehiclesRepository.count({
        where: { estado: 'Disponible', clasificacion_inventario: 'En Stock' },
      });

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startOfMonthString = startOfMonth.toISOString().split('T')[0];
      const endOfMonthString = endOfMonth.toISOString().split('T')[0];

      const monthlySales = await this.ventasRepository.find({
        where: {
          vendedor: { id: user.id },
          fecha_venta: Between(startOfMonthString as any, endOfMonthString as any),
        },
      });
      const monthlySalesCount = monthlySales.length;
      const monthlyRevenue = monthlySales.reduce(
        (sum, venta) => sum + Number(venta.monto_final),
        0,
      );
      this.logger.debug(
        `Salesperson Stats (User ${user.id}): Monthly Sales=${monthlySalesCount}, Revenue=${monthlyRevenue}`,
      );

      const commissionParam = await this.parametrosRepository.findOne({
        where: { nombre: 'COMISION_VENDEDOR_PORC' },
      });
      const commissionPercentage = commissionParam
        ? Number(commissionParam.valor) / 100
        : 0.05;
      const estimatedCommissions = monthlyRevenue * commissionPercentage;
      this.logger.debug(
        `Salesperson Stats (User ${user.id}): Estimated Commissions=${estimatedCommissions}`,
      );

      const pendingQuotesCount = await this.cotizacionesRepository.count({
        where: {
          vendedor: { id: user.id },
          estado: In(['Borrador', 'Enviada']),
        },
      });
      const newLeadsCount = await this.leadRepository.count({
        where: { vendedor_asignado: { id: user.id }, estado: 'Nuevo' },
      });
      const pendingItemsCount = pendingQuotesCount + newLeadsCount;
      this.logger.debug(
        `Salesperson Stats (User ${user.id}): Pending Quotes=${pendingQuotesCount}, New Leads=${newLeadsCount}`,
      );

      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      fiveMonthsAgo.setDate(1);
      const fiveMonthsAgoString = fiveMonthsAgo.toISOString().split('T')[0];

      const salesDataRaw = await this.ventasRepository
        .createQueryBuilder('venta')
        .select("TO_CHAR(venta.fecha_venta, 'YYYY-MM')", 'month_key')
        .addSelect("TO_CHAR(venta.fecha_venta, 'TMMonth')", 'month_name')
        .addSelect('COUNT(venta.id)', 'vendidos')
        .where('venta.vendedorId = :userId', { userId: user.id })
        .andWhere('venta.fecha_venta >= :startDate', {
          startDate: fiveMonthsAgoString,
        })
        .groupBy('month_key, month_name')
        .orderBy('month_key', 'ASC')
        .getRawMany();

      const salesData: { month: string; vendidos: number }[] = [];
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        const monthData = salesDataRaw.find((d) => d.month_key === monthKey);
        salesData.push({
          month: monthNames[monthIndex],
          vendidos: monthData ? parseInt(monthData.vendidos, 10) : 0,
        });
      }
      this.logger.debug(
        `Salesperson Stats (User ${user.id}): Historical sales data generated.`,
      );

      return {
        totalVehicles,
        monthlySalesCount,
        monthlyRevenue,
        estimatedCommissions,
        pendingItemsCount,
        salesData,
      };
    } catch (error) {
      this.logger.error(
        `getSalespersonDashboardStats: Failed for user ID ${user.id}`,
        error,
      );
      throw new InternalServerErrorException(
        `Error al obtener estadísticas para el vendedor.`,
      );
    }
  }
} // End of VehiclesService class