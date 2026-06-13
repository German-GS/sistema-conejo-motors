import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Importacion } from './importacion.entity';
import { ImportacionVehiculo } from './importacion-vehiculo.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleEstadoHistorial } from '../vehicles/vehicle-estado-historial.entity';

@Injectable()
export class ImportacionesService {
  private readonly logger = new Logger(ImportacionesService.name);

  constructor(
    @InjectRepository(Importacion) private repo: Repository<Importacion>,
    @InjectRepository(ImportacionVehiculo) private vehiculoRepo: Repository<ImportacionVehiculo>,
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(VehicleEstadoHistorial) private historialRepo: Repository<VehicleEstadoHistorial>,
  ) {}

  findAll(): Promise<Importacion[]> {
    return this.repo.find({ relations: ['responsable', 'vehiculos', 'vehiculos.vehiculo'], order: { creado_en: 'DESC' } });
  }

  findOne(id: number): Promise<any> {
    return this.repo.findOne({ where: { id }, relations: ['responsable', 'vehiculos', 'vehiculos.vehiculo'] });
  }

  async create(data: Partial<Importacion>): Promise<any> {
    const imp = this.repo.create(data);
    return this.repo.save(imp);
  }

  async update(id: number, data: Partial<Importacion>): Promise<any> {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async addVehiculo(importacionId: number, data: Partial<ImportacionVehiculo>): Promise<any> {
    const v = this.vehiculoRepo.create({ ...data, importacion: { id: importacionId } as any });
    return this.vehiculoRepo.save(v);
  }

  async removeVehiculo(id: number): Promise<any> {
    await this.vehiculoRepo.delete(id);
  }

  /**
   * Promueve un vehículo de importación a inventario: crea el registro real en
   * `vehiculos` (oculto hasta completar) y lo vincula. Evita duplicar.
   * `extra` permite completar datos faltantes desde el frontend (marca, modelo, etc.).
   */
  async promoverAVehiculo(
    impVehId: number,
    extra: Partial<ImportacionVehiculo> = {},
  ): Promise<{ vehiculo: Vehicle; mensaje: string }> {
    const impVeh = await this.vehiculoRepo.findOne({
      where: { id: impVehId },
      relations: ['vehiculo'],
    });
    if (!impVeh) throw new NotFoundException(`Vehículo de importación #${impVehId} no encontrado.`);
    if (impVeh.vehiculo) {
      throw new ConflictException(`Este vehículo ya fue creado en inventario (#${impVeh.vehiculo.id}).`);
    }

    // Combinar datos del registro de importación con lo enviado por el frontend
    const vin    = (extra.vin    ?? impVeh.vin    ?? '').trim();
    const marca  = (extra.marca  ?? impVeh.marca  ?? '').trim();
    const modelo = (extra.modelo ?? impVeh.modelo ?? '').trim();
    const anio   = extra.anio    ?? impVeh.anio;
    const color  = (extra.color  ?? impVeh.color  ?? '').trim();
    const costo  = Number(extra.costo_estimado_crc ?? impVeh.costo_estimado_crc ?? impVeh.valor_fob ?? 0);

    const faltantes: string[] = [];
    if (!vin) faltantes.push('VIN');
    if (!marca) faltantes.push('marca');
    if (!modelo) faltantes.push('modelo');
    if (!anio) faltantes.push('año');
    if (!color) faltantes.push('color');
    if (faltantes.length) {
      throw new BadRequestException(`Faltan datos para crear el vehículo: ${faltantes.join(', ')}.`);
    }

    const yaExiste = await this.vehiclesRepo.findOneBy({ vin });
    if (yaExiste) {
      throw new ConflictException(`Ya existe un vehículo con VIN ${vin} (#${yaExiste.id}).`);
    }

    const vehiculo = this.vehiclesRepo.create({
      vin,
      marca,
      modelo,
      año: anio,
      color,
      precio_costo: costo,
      precio_venta: costo,          // precio de lista inicial = costo; ajustar en /admin/pricing
      precio_venta_final: costo,
      descuento_porcentaje: 0,
      estado: 'Disponible',
      visibilidad: 'Oculto',        // oculto hasta completar ficha y precio
    });
    const saved = await this.vehiclesRepo.save(vehiculo);

    // Persistir datos en el registro de importación y vincular
    impVeh.vin = vin;
    impVeh.marca = marca;
    impVeh.modelo = modelo;
    impVeh.anio = anio;
    impVeh.color = color;
    impVeh.costo_estimado_crc = costo;
    impVeh.vehiculo = saved;
    await this.vehiculoRepo.save(impVeh);

    await this.historialRepo.save({
      vehiculo: { id: saved.id } as any,
      estado_anterior: undefined,
      estado_nuevo: 'Disponible',
      tipo: 'estado',
      motivo: 'Alta en inventario desde importación',
    });

    this.logger.log(`Veh importación #${impVehId} promovido a inventario veh #${saved.id} (VIN ${vin}).`);
    return { vehiculo: saved, mensaje: `Vehículo creado en inventario (#${saved.id}) y oculto hasta completar ficha/precio.` };
  }
}
