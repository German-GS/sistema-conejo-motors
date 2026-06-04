/// backend/src/vehicles/vehicles.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThanOrEqual, Repository, DataSource } from 'typeorm';
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
export class VehiclesService {
  // Logger para mensajes de servicio
  private readonly logger = new Logger(VehiclesService.name);

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
  ) {}

  // --- Método Create ---
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
      where: { estado: 'Disponible' },
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

  async updatePricing(id: number, data: { precio_venta?: number; descuento_porcentaje?: number }) {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });
    if (!vehicle) throw new NotFoundException(`Vehículo #${id} no encontrado.`);

    if (data.precio_venta !== undefined) vehicle.precio_venta = data.precio_venta;
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
        where: { estado: 'Disponible' },
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

  /** Admin: libera un vehículo Reservado → vuelve a Disponible */
  async liberarVehiculo(id: number): Promise<{ ok: boolean; message: string }> {
    const vehiculo = await this.vehiclesRepository.findOneBy({ id });
    if (!vehiculo) throw new NotFoundException(`Vehículo #${id} no encontrado.`);
    if (vehiculo.estado !== 'Reservado') {
      return { ok: false, message: `El vehículo ya está en estado "${vehiculo.estado}".` };
    }
    await this.vehiclesRepository.update(id, { estado: 'Disponible' });
    return { ok: true, message: `Vehículo #${id} liberado exitosamente.` };
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
      this.vehiclesRepository.count({ where: { estado: 'Disponible' } }),
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

    // ── Leads — estados reales del sistema ────────────────────────────────────
    const leadsActivos = await this.leadRepository.count({
      where: { estado: In(['Nuevo', 'Contactado', 'En Progreso']) },
    });
    const leadsCerradosMes = await this.leadRepository.count({
      where: { estado: 'Cerrado', fecha_creacion: MoreThanOrEqual(startOfMonth) },
    });
    const leadsPerdidosMes = await this.leadRepository.count({
      where: { estado: 'Perdido', fecha_creacion: MoreThanOrEqual(startOfMonth) },
    });
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
      .andWhere("c.estado NOT IN ('Aceptada','Facturada','Rechazada')")
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

    return {
      inventario: { disponibles, reservados, vendidosMes, ingresosVehiculosMes },
      leads: { activos: leadsActivos, cerradosMes: leadsCerradosMes, perdidosMes: leadsPerdidosMes, hoy: leadsHoy },
      cotizaciones: { activas: cotizacionesActivas, vencidas: cotizacionesVencidas, mes: cotizacionesMes },
      repuestos: { ventasMes: repuestosVentasMes, ingresosMes: repuestosIngresosMes },
      topVendedores,
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
        where: { estado: 'Disponible' },
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