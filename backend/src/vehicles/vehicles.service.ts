import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// --- 👇 1. AÑADE 'In' A ESTA LÍNEA 👇 ---
import { Between, In, MoreThanOrEqual, Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Venta } from '../ventas/venta.entity';
import { User } from '../users/user.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { PlanillaParametro } from '../planilla-parametros/entities/planilla-parametro.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleImage } from './vehicle-image.entity';
import { Bodega } from '../bodegas/bodega.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(Cotizacion)
    private readonly cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(PlanillaParametro)
    private readonly parametrosRepository: Repository<PlanillaParametro>,
    @InjectRepository(VehicleImage)
    private readonly imagesRepository: Repository<VehicleImage>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
  ) {}

  // --- 👇 2. EL RESTO DE LA FUNCIÓN YA ESTÁ CORRECTO 👇 ---
  async getSalespersonDashboardStats(user: User) {
    const totalVehicles = await this.vehiclesRepository.count({
      where: { estado: 'Disponible' },
    });

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlySales = await this.ventasRepository.find({
      where: {
        vendedor: { id: user.id },
        fecha_venta: Between(startOfMonth, endOfMonth),
      },
    });

    const monthlySalesCount = monthlySales.length;
    const monthlyRevenue = monthlySales.reduce(
      (sum, venta) => sum + Number(venta.monto_final),
      0,
    );

    const commissionParam = await this.parametrosRepository.findOne({
      where: { nombre: 'COMISION_VENDEDOR_PORC' },
    });
    const commissionPercentage = commissionParam
      ? Number(commissionParam.valor) / 100
      : 0.05;
    const estimatedCommissions = monthlyRevenue * commissionPercentage;

    const pendingQuotes = await this.cotizacionesRepository.count({
      where: {
        vendedor: { id: user.id },
        estado: In(['Borrador', 'Enviada']),
      },
    });

    return {
      totalVehicles,
      monthlySalesCount,
      monthlyRevenue,
      estimatedCommissions,
      pendingQuotes,
    };
  }

  // ... (El resto de los métodos de tu servicio no necesitan cambios)
  async getDashboardStats() {
    // --- KPIs de Inventario (Datos Reales) ---
    const vehiclesInStock = await this.vehiclesRepository.find({
      where: { estado: 'Disponible' },
    });
    const totalVehicles = vehiclesInStock.length;
    const inventoryCost = vehiclesInStock.reduce(
      (sum, vehicle) => sum + Number(vehicle.precio_costo || 0),
      0,
    );

    // --- KPIs de Ventas (Datos Reales) ---
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthlySalesData = await this.ventasRepository.find({
      where: { fecha_venta: MoreThanOrEqual(startOfMonth) },
    });
    const monthlySales = monthlySalesData.length;
    const monthlyRevenue = monthlySalesData.reduce(
      (sum, venta) => sum + Number(venta.monto_final),
      0,
    );

    // --- Gráfico de Ventas (Datos Reales de los últimos 6 meses) ---
    const salesData: { month: string; vendidos: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('es-ES', { month: 'long' });
      const year = date.getFullYear();

      const firstDay = new Date(year, date.getMonth(), 1);
      const lastDay = new Date(year, date.getMonth() + 1, 0);

      const salesInMonth = await this.ventasRepository.count({
        where: {
          fecha_venta: Between(firstDay, lastDay),
        },
      });

      salesData.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        vendidos: salesInMonth,
      });
    }

    return {
      totalVehicles,
      inventoryCost,
      monthlySales,
      monthlyRevenue,
      salesData,
    };
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const { bodegaId, ...vehicleData } = createVehicleDto;

    let bodega: Bodega | null = null;
    let currentLocation: string | undefined = undefined;

    if (bodegaId) {
      bodega = await this.bodegaRepository.findOneBy({ id: bodegaId });
      if (!bodega) {
        throw new NotFoundException(
          `La bodega con el ID #${bodegaId} no fue encontrada.`,
        );
      }
      currentLocation = bodega.nombre;
    } else {
      const firstBodega = await this.bodegaRepository.findOne({
        order: { id: 'ASC' },
      });
      if (firstBodega) {
        currentLocation = firstBodega.nombre;
      } else {
        currentLocation = 'En Tránsito';
      }
    }

    const newVehicle = this.vehiclesRepository.create({
      ...vehicleData,
      currentLocation: currentLocation,
      bodega: bodega,
    });

    return this.vehiclesRepository.save(newVehicle);
  }

  async findCatalog(): Promise<Omit<Vehicle, 'precio_costo'>[]> {
    const vehicles = await this.vehiclesRepository.find({
      where: { estado: 'Disponible' },
      relations: ['bodega', 'imagenes'],
    });
    return vehicles.map(({ precio_costo, ...vehicle }) => vehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({ relations: ['bodega', 'imagenes'] });
  }

  async findOne(id: number): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { id },
      relations: ['bodega', 'imagenes'],
    });
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const { bodegaId, ...vehicleData } = updateVehicleDto;
    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...vehicleData,
    });

    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }

    if (bodegaId !== undefined) {
      if (bodegaId === null) {
        vehicle.bodega = null;
      } else {
        const bodega = await this.bodegaRepository.findOneBy({ id: bodegaId });
        if (bodega) {
          vehicle.bodega = bodega;
        } else {
          throw new NotFoundException(
            `La bodega con el ID #${bodegaId} no fue encontrada`,
          );
        }
      }
    }

    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const vehicle = await this.findOne(id);
    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }
    await this.vehiclesRepository.remove(vehicle);
  }

  async addImages(vehicleId: number, imagePaths: string[]) {
    const vehicle = await this.findOne(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(
        `Vehículo con ID #${vehicleId} no encontrado`,
      );
    }

    const images = imagePaths.map((path) =>
      this.imagesRepository.create({
        url: path,
        vehicle: vehicle,
      }),
    );

    return this.imagesRepository.save(images);
  }

  async updateImages(
    vehicleId: number,
    imagesToUpdate: { id: number; order: number }[],
    idsToDelete: number[],
  ) {
    return this.imagesRepository.manager.transaction(
      async (transactionalEntityManager) => {
        if (idsToDelete && idsToDelete.length > 0) {
          await transactionalEntityManager.delete(VehicleImage, idsToDelete);
        }
        if (imagesToUpdate && imagesToUpdate.length > 0) {
          const updatePromises = imagesToUpdate.map((image) =>
            transactionalEntityManager.update(
              VehicleImage,
              { id: image.id },
              { order: image.order },
            ),
          );
          await Promise.all(updatePromises);
        }
      },
    );
  }
}
