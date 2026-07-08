import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Vehicle } from './vehicle.entity';
import { VehicleProfile } from '../vehicle-profiles/vehicle-profile.entity';
import { AccesorioVehiculo } from '../accesorios/accesorio.entity';
import { VehiclesService } from './vehicles.service';

export interface ImportPreviewRow {
  rowIndex: number;
  numero: number;
  cuenta_contable: string;
  marca: string;
  modelo: string;
  vin: string;
  año: number | null;
  color: string;
  incoterm: string;
  costo_factura_usd: number;
  tipo_cambio: number;
  costo_factura_crc: number;
  tasa_caldera: number;
  acarreo: number;
  costo_nacionalizacion: number;
  inscripcion_traspaso: number;
  marchamo: number;
  iva_importacion: number;
  costo_total_crc: number;
  estado: string;
  // accesorios
  color_interior?: string;
  observaciones?: string;
  cargador_pared?: string;
  extension_cargador?: string;
  triangulos_seguridad?: string;
  manuales?: string;
  llave_control?: string;
  gas_inflar_llantas?: string;
  compresor_llantas?: string;
  llave_ruedas?: string;
  set_escobillas?: string;
  filtro_polen?: string;
  // para asignar perfil
  profileId?: number;
  error?: string;
}

@Injectable()
export class VehiclesImportService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(VehicleProfile)
    private profilesRepo: Repository<VehicleProfile>,
    @InjectRepository(AccesorioVehiculo)
    private accesoriosRepo: Repository<AccesorioVehiculo>,
    private readonly vehiclesService: VehiclesService,
  ) {}

  /** Normaliza un string de header para comparación robusta */
  private normalizeKey(s: string): string {
    return s
      .replace(/[\r\n]+/g, ' ')
      // Transliterar vocales acentuadas y ñ al equivalente ASCII
      .replace(/[áàäâ]/gi, 'a')
      .replace(/[éèëê]/gi, 'e')
      .replace(/[íìïî]/gi, 'i')
      .replace(/[óòöô]/gi, 'o')
      .replace(/[úùüû]/gi, 'u')
      .replace(/[ñ]/gi, 'n')
      .replace(/[^a-z0-9 ]/gi, '') // quita resto de especiales (₡, →, /, +, °, etc.)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /** Encuentra la fila de headers buscando la celda que contenga "VIN" */
  private findHeaderRow(rows: any[][]): { headerIdx: number; colMap: Record<string, number> } {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const vinCol = row.findIndex(c => c && this.normalizeKey(c.toString()) === 'vin');
      if (vinCol !== -1) {
        const colMap: Record<string, number> = {};
        row.forEach((cell, idx) => {
          if (cell != null) {
            colMap[this.normalizeKey(cell.toString())] = idx;
          }
        });
        return { headerIdx: i, colMap };
      }
    }
    throw new BadRequestException('No se encontró la fila de encabezados (no hay columna "VIN")');
  }

  private col(row: any[], colMap: Record<string, number>, ...keys: string[]): any {
    for (const key of keys) {
      const idx = colMap[this.normalizeKey(key)];
      if (idx !== undefined && row[idx] != null && row[idx] !== '') return row[idx];
    }
    return null;
  }

  async parseExcel(buffer: Buffer): Promise<ImportPreviewRow[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const inventSheet = workbook.Sheets['1030 Inventario vehiculos'];
    const accsSheet = workbook.Sheets['Accesorios por Vehiculo'];

    if (!inventSheet) throw new BadRequestException('No se encontró la hoja "1030 Inventario vehiculos"');

    const inventRows: any[][] = XLSX.utils.sheet_to_json(inventSheet, { header: 1, defval: null });
    const { headerIdx, colMap } = this.findHeaderRow(inventRows);

    // Parsear accesorios por nombre de columna también
    const accMap: Record<string, any> = {};
    if (accsSheet) {
      const accRows: any[][] = XLSX.utils.sheet_to_json(accsSheet, { header: 1, defval: null });
      try {
        const { headerIdx: aHdr, colMap: aCols } = this.findHeaderRow(accRows);
        accRows.slice(aHdr + 1).forEach((row) => {
          const vin = this.col(row, aCols, 'vin');
          if (vin) {
            accMap[vin.toString().trim()] = {
              color_interior:      this.col(row, aCols, 'color interior', 'color\ninterior') || null,
              observaciones:       this.col(row, aCols, 'observaciones') || null,
              cargador_pared:      this.col(row, aCols, 'cargador de pared') || null,
              extension_cargador:  this.col(row, aCols, 'extensión cargador', 'extension cargador') || null,
              triangulos_seguridad:this.col(row, aCols, 'triángulos de seguridad', 'triangulos de seguridad') || null,
              manuales:            this.col(row, aCols, 'manuales') || null,
              llave_control:       this.col(row, aCols, 'llave y control') || null,
              gas_inflar_llantas:  this.col(row, aCols, 'gas para inflar llantas') || null,
              compresor_llantas:   this.col(row, aCols, 'compresor para llantas', 'compresor llantas') || null,
              llave_ruedas:        this.col(row, aCols, 'llave de ruedas') || null,
              set_escobillas:      this.col(row, aCols, 'set de escobillas', 'set escobillas') || null,
              filtro_polen:        this.col(row, aCols, 'filtro de polen') || null,
            };
          }
        });
      } catch (_) { /* hoja de accesorios sin header válido, se ignora */ }
    }

    // Filas de datos: todo después del header que tenga un número en col N° y un VIN
    const dataRows = inventRows.slice(headerIdx + 1).filter((row) => {
      const num = this.col(row, colMap, 'n°', 'n', 'numero', 'no');
      const vin = this.col(row, colMap, 'vin');
      return num && !isNaN(Number(num)) && vin;
    });

    const profiles = await this.profilesRepo.find();
    const existingVins = new Set(
      (await this.vehiclesRepo.find({ select: ['vin'] })).map(v => v.vin)
    );

    const preview: ImportPreviewRow[] = dataRows.map((row, idx) => {
      const vin   = (this.col(row, colMap, 'vin') ?? '').toString().trim();
      const marca = (this.col(row, colMap, 'marca') ?? '').toString().trim();
      const modelo= (this.col(row, colMap, 'modelo') ?? '').toString().trim();

      // Buscar perfil coincidente — primero exacto, luego por contención
      const marcaN  = this.normalizeKey(marca);
      const modeloN = this.normalizeKey(modelo);

      const matchedProfile =
        // 1. Match exacto
        profiles.find(p =>
          this.normalizeKey(p.marca ?? '') === marcaN &&
          this.normalizeKey(p.modelo ?? '') === modeloN
        ) ??
        // 2. Uno contiene al otro (ej. "Seagull" ⊂ "Seagull Flying")
        profiles.find(p => {
          const pm = this.normalizeKey(p.modelo ?? '');
          return this.normalizeKey(p.marca ?? '') === marcaN &&
                 (pm.includes(modeloN) || modeloN.includes(pm));
        });

      let error: string | undefined;
      if (!vin) error = 'VIN faltante';
      else if (existingVins.has(vin)) error = 'VIN ya existe en el sistema';

      const num = (this.col(row, colMap, 'n°', 'n', 'numero', 'no') ?? idx + 1);
      const año         = this.col(row, colMap, 'ano', 'year');
      const color       = this.col(row, colMap, 'color', 'color exterior');
      const cuenta      = this.col(row, colMap, 'cuenta');
      const incoterm    = this.col(row, colMap, 'incoterm');
      const costoUsd    = this.col(row, colMap, 'costo factura usd');
      const tc          = this.col(row, colMap, 'tc usd', 'tipo de cambio', 'tc');
      const costoCrc    = this.col(row, colMap, 'costo factura crc');
      const tasaCaldera = this.col(row, colMap, 'tasa caldera');
      const acarreo     = this.col(row, colMap, 'acarreo puertobodega', 'acarreo');
      const nacion      = this.col(row, colMap, 'costo nacionalizacion');
      const inscripcion = this.col(row, colMap, 'inscripcion traspaso');
      const marchamo    = this.col(row, colMap, 'marchamo');
      const ivaImport   = this.col(row, colMap, 'iva importacion', 'iva de importacion', 'iva acreditable', 'iva');
      const costoTotal  = this.col(row, colMap, 'costo total inventario crc', 'costo total crc');
      const estadoCol   = this.col(row, colMap, 'estado', 'estado vehiculo', 'nuevo o usado');

      return {
        rowIndex: idx,
        numero: Number(num),
        cuenta_contable: cuenta?.toString() ?? '1030',
        marca,
        modelo,
        vin,
        año: año ? Number(año) : null,
        color: color?.toString().trim() ?? '',
        incoterm: incoterm?.toString().trim() ?? '',
        costo_factura_usd: Number(costoUsd) || 0,
        tipo_cambio: Number(tc) || 0,
        costo_factura_crc: Number(costoCrc) || 0,
        tasa_caldera: Number(tasaCaldera) || 0,
        acarreo: Number(acarreo) || 0,
        costo_nacionalizacion: Number(nacion) || 0,
        inscripcion_traspaso: Number(inscripcion) || 0,
        marchamo: Number(marchamo) || 0,
        iva_importacion: Number(ivaImport) || 0,
        costo_total_crc: Number(costoTotal) || 0,
        estado: estadoCol?.toString().trim() ?? '',
        profileId: matchedProfile?.id,
        ...accMap[vin],
        error,
      };
    });

    return preview;
  }

  async importRows(rows: ImportPreviewRow[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    const existingVins = new Set(
      (await this.vehiclesRepo.find({ select: ['vin'] })).map(v => v.vin)
    );

    for (const row of rows) {
      if (!row.vin || existingVins.has(row.vin)) { skipped++; continue; }

      let profile: VehicleProfile | null = null;
      if (row.profileId) {
        profile = await this.profilesRepo.findOneBy({ id: row.profileId });
      }

      // El IVA de importación es crédito fiscal acreditable: NO capitaliza al inventario.
      // precio_costo (costo de inventario y base de COGS) = costo total − IVA.
      const iva = Number(row.iva_importacion) || 0;
      const costoInventario = +(Number(row.costo_total_crc) - iva).toFixed(2);

      const vehicle = this.vehiclesRepo.create({
        vin: row.vin,
        marca: row.marca,
        modelo: row.modelo,
        año: row.año ?? undefined,
        color: row.color,
        precio_costo: costoInventario,
        precio_venta: costoInventario,   // Precio de lista inicial = costo (ajustar en /admin/pricing)
        precio_venta_final: costoInventario,
        iva_importacion: iva,
        descuento_porcentaje: 0,
        estado: 'Disponible',
        cuenta_contable: row.cuenta_contable,
        incoterm: row.incoterm,
        costo_factura_usd: row.costo_factura_usd,
        tipo_cambio: row.tipo_cambio,
        tasa_caldera: row.tasa_caldera,
        acarreo: row.acarreo,
        costo_nacionalizacion: row.costo_nacionalizacion,
        inscripcion_traspaso: row.inscripcion_traspaso,
        marchamo: row.marchamo,
        observaciones: row.observaciones,
        profile: profile ?? undefined,
      });

      const savedVehicle = await this.vehiclesRepo.save(vehicle);

      // Crear registro de accesorios
      const acc = this.accesoriosRepo.create({
        vehiculo: savedVehicle as any,
        color_interior: row.color_interior,
        observaciones: row.observaciones,
        cargador_pared: row.cargador_pared,
        extension_cargador: row.extension_cargador,
        triangulos_seguridad: row.triangulos_seguridad,
        manuales: row.manuales,
        llave_control: row.llave_control,
        gas_inflar_llantas: row.gas_inflar_llantas,
        compresor_llantas: row.compresor_llantas,
        llave_ruedas: row.llave_ruedas,
        set_escobillas: row.set_escobillas,
        filtro_polen: row.filtro_polen,
      });
      await this.accesoriosRepo.save(acc);

      // Asiento de compra automático (Debe 1300 Inventario / Haber 2100 CxP).
      // El costo capitaliza el landed cost completo del Excel (FOB + nacionalización + impuestos + acarreo…).
      await this.vehiclesService
        .registrarCompraVehiculo(savedVehicle)
        .catch(() => { /* no bloquear la importación si la contabilidad falla */ });

      imported++;
    }

    return { imported, skipped };
  }
}
