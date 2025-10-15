import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
import { Lead } from '../leads/lead.entity';

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
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>, 
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

    const pendingQuotesCount = await this.cotizacionesRepository.count({
      where: {
        vendedor: { id: user.id },
        estado: In(['Borrador', 'Enviada']),
      },
    });
    const newLeadsCount = await this.leadRepository.count({
        where: {
            vendedor_asignado: { id: user.id },
            estado: 'Nuevo',
        },
    });
    const pendingItemsCount = pendingQuotesCount + newLeadsCount;

    const salesDataRaw = await this.ventasRepository
      .createQueryBuilder('venta')
      .select("TO_CHAR(venta.fecha_venta, 'YYYY-MM')", 'month_key')
      .addSelect("TO_CHAR(venta.fecha_venta, 'Month')", 'month')
      .addSelect('COUNT(venta.id)', 'vendidos')
      .where('venta.vendedorId = :userId', { userId: user.id })
      .andWhere("venta.fecha_venta >= date_trunc('month', NOW() - interval '5 months')")
      .groupBy('month_key, month')
      .orderBy('month_key', 'ASC')
      .getRawMany();

    // --- 👇 AQUÍ ESTÁ LA CORRECCIÓN 👇 ---
    // Se añade el tipo explícito al array para que TypeScript sepa qué esperar.
    const salesData: { month: string; vendidos: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('es-ES', { month: 'long' });
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const monthData = salesDataRaw.find(d => d.month_key === monthKey);
        salesData.push({
            month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            vendidos: monthData ? parseInt(monthData.vendidos, 10) : 0,
        });
    }

    return {
      totalVehicles,
      monthlySalesCount,
      monthlyRevenue,
      estimatedCommissions,
      pendingItemsCount,
      salesData,
    };
}

  

  // ... (El resto de los métodos de tu servicio no necesitan cambios)
  // En: backend/src/vehicles/vehicles.service.ts

  async getDashboardStats() {
    // --- KPIs de Inventario (Sin cambios) ---
    const vehiclesInStock = await this.vehiclesRepository.find({
      where: { estado: 'Disponible' },
    });
    const totalVehicles = vehiclesInStock.length;
    const inventoryCost = vehiclesInStock.reduce(
      (sum, vehicle) => sum + Number(vehicle.precio_costo || 0),
      0,
    );

    // --- KPIs de Ventas (Con mejoras) ---
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 👇 MEJORA: Ahora cargamos las relaciones para poder acceder al costo del vehículo
    const monthlySalesData = await this.ventasRepository.find({
      where: { fecha_venta: MoreThanOrEqual(startOfMonth) },
      relations: ['cotizacion.vehiculo'], // <-- AÑADIDO
    });

    const monthlySales = monthlySalesData.length;
    const monthlyRevenue = monthlySalesData.reduce(
      (sum, venta) => sum + Number(venta.monto_final),
      0,
    );

    // --- 👇 INICIO DEL NUEVO CÓDIGO ---

    // 1. CÁLCULO DE GANANCIA BRUTA DEL MES
    const monthlyCostOfGoodsSold = monthlySalesData.reduce(
      (sum, venta) => sum + Number(venta.cotizacion.vehiculo.precio_costo || 0),
      0,
    );
    const monthlyGrossProfit = monthlyRevenue - monthlyCostOfGoodsSold;

    // 2. CÁLCULO DE VENTAS POR VENDEDOR PARA EL GRÁFICO
    const salesBySellerData = await this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.vendedor', 'vendedor')
      .select('vendedor.nombre_completo', 'name')
      .addSelect('COUNT(venta.id)', 'ventas')
      .where('venta.fecha_venta >= :startOfMonth', { startOfMonth })
      .groupBy('vendedor.nombre_completo')
      .orderBy('"ventas"', 'DESC')
      .getRawMany();

    // --- 👆 FIN DEL NUEVO CÓDIGO ---


    // --- Gráfico de Ventas Históricas (Sin cambios) ---
    const salesData: { month: string; vendidos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      // ... (código existente sin cambios)
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('es-ES', { month: 'long' });
      const year = date.getFullYear();
      const firstDay = new Date(year, date.getMonth(), 1);
      const lastDay = new Date(year, date.getMonth() + 1, 0);
      const salesInMonth = await this.ventasRepository.count({
        where: { fecha_venta: Between(firstDay, lastDay) },
      });
      salesData.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        vendidos: salesInMonth,
      });
    }

    // 👇 MEJORA: Devolvemos los nuevos datos
    return {
      totalVehicles,
      inventoryCost,
      monthlySales,
      monthlyRevenue,
      salesData,
      monthlyGrossProfit,   // <-- NUEVO
      salesBySellerData,    // <-- NUEVO
    };
  }

  // Reemplaza este método en: backend/src/vehicles/vehicles.service.ts

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    // 1. Desestructura el DTO para separar los campos que son strings (y deben ser arrays) del resto.
    const {
      bodegaId,
      colores_disponibles,
      seguridad,
      interior,
      exterior,
      tecnologia,
      ...vehicleData // El resto de las propiedades del DTO
    } = createVehicleDto;

    // La lógica de conversión de datos numéricos que podrían venir vacíos se mantiene
    Object.keys(vehicleData).forEach((key) => {
      const numericKeys = [
        'potencia_hp', 'torque_nm', 'aceleracion_0_100', 'velocidad_maxima',
        'autonomia_km', 'capacidad_bateria_kwh', 'tiempo_carga_dc',
        'tiempo_carga_ac', 'largo_mm', 'ancho_mm', 'alto_mm',
        'distancia_ejes_mm', 'peso_kg', 'capacidad_maletero_l',
        'numero_pasajeros',
      ];
      if (numericKeys.includes(key) && (vehicleData as any)[key] === '') {
        (vehicleData as any)[key] = null;
      }
    });

    // 2. Transforma los strings separados por comas en arrays de strings.
    const transformedData = {
      ...vehicleData,
      colores_disponibles: colores_disponibles ? colores_disponibles.split(',').map(s => s.trim()) : [],
      seguridad: seguridad ? seguridad.split(',').map(s => s.trim()) : [],
      interior: interior ? interior.split(',').map(s => s.trim()) : [],
      exterior: exterior ? exterior.split(',').map(s => s.trim()) : [],
      tecnologia: tecnologia ? tecnologia.split(',').map(s => s.trim()) : [],
    };
    
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
      const bodegas = await this.bodegaRepository.find({
        order: { id: 'ASC' },
        take: 1,
      });

      if (bodegas.length > 0) {
        bodega = bodegas[0];
        currentLocation = bodega.nombre;
      } else {
        currentLocation = 'En Tránsito';
      }
    }

    // 3. Crea la nueva instancia del vehículo usando los datos ya transformados.
    const newVehicle = this.vehiclesRepository.create({
      ...transformedData,
      currentLocation: currentLocation,
      bodega: bodega,
    });

    try {
      return await this.vehiclesRepository.save(newVehicle);
    } catch (error) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Ya existe un vehículo registrado con este VIN.',
        );
      }
      throw error;
    }
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

  // Reemplaza este método en: backend/src/vehicles/vehicles.service.ts

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    // 1. Desestructura el DTO para separar los campos que necesitan transformación.
    const {
      bodegaId,
      colores_disponibles,
      seguridad,
      interior,
      exterior,
      tecnologia,
      ...vehicleData // El resto de los datos del DTO
    } = updateVehicleDto;

    // La lógica para limpiar campos numéricos vacíos se mantiene.
    Object.keys(vehicleData).forEach((key) => {
      const numericKeys = [
        'potencia_hp', 'torque_nm', 'aceleracion_0_100', 'velocidad_maxima',
        'autonomia_km', 'capacidad_bateria_kwh', 'tiempo_carga_dc',
        'tiempo_carga_ac', 'largo_mm', 'ancho_mm', 'alto_mm',
        'distancia_ejes_mm', 'peso_kg', 'capacidad_maletero_l',
        'numero_pasajeros', 'precio_costo', 'precio_venta', 'año'
      ];
      if (numericKeys.includes(key) && (vehicleData as any)[key] === '') {
        (vehicleData as any)[key] = null;
      }
    });

    // 2. Prepara el objeto de datos para `preload`.
    const dataToPreload: { [key: string]: any } = { ...vehicleData };

    // 3. Transforma los strings a arrays, solo si la propiedad existe en el DTO.
    //    Esto es importante porque en una actualización, pueden no venir todos los campos.
    if (colores_disponibles !== undefined) {
      dataToPreload.colores_disponibles = colores_disponibles ? colores_disponibles.split(',').map(s => s.trim()) : [];
    }
    if (seguridad !== undefined) {
      dataToPreload.seguridad = seguridad ? seguridad.split(',').map(s => s.trim()) : [];
    }
    if (interior !== undefined) {
      dataToPreload.interior = interior ? interior.split(',').map(s => s.trim()) : [];
    }
    if (exterior !== undefined) {
      dataToPreload.exterior = exterior ? exterior.split(',').map(s => s.trim()) : [];
    }
    if (tecnologia !== undefined) {
      dataToPreload.tecnologia = tecnologia ? tecnologia.split(',').map(s => s.trim()) : [];
    }

    // 4. Llama a `preload` con los datos ya transformados.
    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...dataToPreload,
    });

    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }

    // La lógica para actualizar la bodega se mantiene igual.
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
