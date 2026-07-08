import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Producto } from './producto.entity';
import { OrdenProducto, LineaOrden } from './orden-producto.entity';
import { User } from '../users/user.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
    @InjectRepository(OrdenProducto)
    private ordenesRepo: Repository<OrdenProducto>,
    @InjectRepository(LineaOrden)
    private lineasRepo: Repository<LineaOrden>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  // ── CRUD Productos ────────────────────────────────────────────────────────

  async findAll(search?: string): Promise<Producto[]> {
    if (search) {
      return this.productosRepo.find({
        where: [
          { nombre: Like(`%${search}%`), activo: true },
          { sku: Like(`%${search}%`), activo: true },
        ],
        order: { nombre: 'ASC' },
      });
    }
    return this.productosRepo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async findAllAdmin(): Promise<Producto[]> {
    return this.productosRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Producto> {
    const p = await this.productosRepo.findOneBy({ id });
    if (!p) throw new NotFoundException(`Producto #${id} no encontrado.`);
    return p;
  }

  async create(data: Partial<Producto>): Promise<Producto> {
    const producto = this.productosRepo.create(data);
    return this.productosRepo.save(producto);
  }

  async update(id: number, data: Partial<Producto>): Promise<Producto> {
    const producto = await this.findOne(id);
    Object.assign(producto, data);
    return this.productosRepo.save(producto);
  }

  async ajustarStock(id: number, delta: number, motivo?: string): Promise<Producto> {
    const producto = await this.findOne(id);
    const nuevoStock = producto.stock + delta;
    if (nuevoStock < 0) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${producto.stock}`);
    }
    producto.stock = nuevoStock;
    return this.productosRepo.save(producto);
  }

  async getStockBajo(): Promise<Producto[]> {
    return this.productosRepo
      .createQueryBuilder('p')
      .where('p.stock <= p.stock_minimo AND p.activo = true')
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  // ── Órdenes de Venta ──────────────────────────────────────────────────────

  async crearOrden(
    vendedor: User,
    body: {
      cliente_nombre: string;
      cliente_cedula?: string;
      cliente_telefono?: string;
      metodo_pago?: string;
      notas?: string;
      descuento?: number;
      lineas: { productoId: number; cantidad: number; descuento_linea?: number }[];
    },
  ): Promise<OrdenProducto> {
    if (!body.lineas?.length) throw new BadRequestException('La orden debe tener al menos un producto.');

    // Validar stock y calcular totales
    const lineasData: Partial<LineaOrden>[] = [];
    let subtotal = 0;

    for (const l of body.lineas) {
      const producto = await this.findOne(l.productoId);
      if (producto.stock < l.cantidad) {
        throw new BadRequestException(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`);
      }
      const desc = l.descuento_linea ?? 0;
      const lineaSubtotal = (producto.precio_venta * l.cantidad) - desc;
      lineasData.push({
        producto,
        cantidad: l.cantidad,
        precio_unitario: producto.precio_venta,
        descuento_linea: desc,
        subtotal: lineaSubtotal,
      });
      subtotal += lineaSubtotal;
    }

    const descuentoTotal = body.descuento ?? 0;
    const total = subtotal - descuentoTotal;

    // Crear orden
    const orden = this.ordenesRepo.create({
      cliente_nombre: body.cliente_nombre,
      cliente_cedula: body.cliente_cedula,
      cliente_telefono: body.cliente_telefono,
      metodo_pago: body.metodo_pago ?? 'Efectivo',
      notas: body.notas,
      subtotal,
      descuento: descuentoTotal,
      total,
      estado: 'Completada',
      vendedor,
    });
    const savedOrden = await this.ordenesRepo.save(orden);

    // Guardar líneas y descontar stock
    for (const l of lineasData) {
      const linea = this.lineasRepo.create({ ...l, orden: savedOrden });
      await this.lineasRepo.save(linea);
      await this.productosRepo.decrement({ id: (l.producto as Producto).id }, 'stock', l.cantidad!);
    }

    const ordenCompleta = await this.ordenesRepo.findOne({
      where: { id: savedOrden.id },
      relations: ['lineas', 'lineas.producto', 'vendedor'],
    });

    // ── Asiento contable automático ───────────────────────────────────────────
    try {
      await this._registrarAsientoRepuestos(ordenCompleta!, vendedor, body.metodo_pago ?? 'Efectivo');
    } catch (e) {
      console.warn('[Productos] No se pudo crear asiento contable:', (e as Error).message);
    }

    return ordenCompleta as OrdenProducto;
  }

  private async _registrarAsientoRepuestos(
    orden: OrdenProducto,
    vendedor: User,
    metodoPago: string,
  ): Promise<void> {
    // Idempotencia: no duplicar el asiento si la orden ya fue contabilizada (reintento).
    if (await this.contabilidad.existeAsientoPorReferencia('OrdenProducto', orden.id)) return;

    const cuentas = await this.contabilidad['cuentasRepo'].find();
    if (!cuentas.length) return;

    const porCodigo = (codigo: string) => cuentas.find((c: any) => c.codigo === codigo);

    const cuentaCobro =
      metodoPago === 'Efectivo' ? porCodigo('1100') : porCodigo('1110');
    const cuentaIngreso    = porCodigo('4200'); // Ventas de Repuestos y Accesorios
    const cuentaCosto      = porCodigo('5200'); // Costo de Ventas — Repuestos
    const cuentaInventario = porCodigo('1400'); // Inventario Repuestos y Accesorios

    if (!cuentaCobro || !cuentaIngreso) return;

    const totalConIva = Number(orden.total) || 0;
    // El total ya incluye IVA (13%); separar base e IVA
    const baseImponible = +(totalConIva / 1.13).toFixed(2);
    const ivaMonto      = +(totalConIva - baseImponible).toFixed(2);

    // Calcular costo total de la orden (suma de precio_costo * cantidad)
    let costoTotal = 0;
    for (const l of orden.lineas ?? []) {
      costoTotal += Number(l.producto?.precio_costo ?? 0) * l.cantidad;
    }

    const cuentaIva = porCodigo('2200');

    const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
      { cuentaId: cuentaCobro.id,   debe: totalConIva,   haber: 0,            descripcion: `Cobro venta repuestos — ${orden.cliente_nombre}` },
      { cuentaId: cuentaIngreso.id, debe: 0,             haber: baseImponible, descripcion: `Ingreso por venta de repuestos/accesorios (sin IVA)` },
    ];

    if (ivaMonto > 0 && cuentaIva) {
      lineas.push({ cuentaId: cuentaIva.id, debe: 0, haber: ivaMonto, descripcion: `IVA 13% — venta repuestos` });
    }

    if (costoTotal > 0 && cuentaCosto && cuentaInventario) {
      lineas.push(
        { cuentaId: cuentaCosto.id,      debe: costoTotal, haber: 0,          descripcion: `Costo de ventas repuestos` },
        { cuentaId: cuentaInventario.id, debe: 0,          haber: costoTotal, descripcion: `Salida de inventario repuestos` },
      );
    }

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    await this.contabilidad.crearAsiento(vendedor, {
      fecha: hoy,
      descripcion: `Venta repuestos/accesorios a ${orden.cliente_nombre} — Orden #${orden.id}`,
      tipo: 'Venta_Producto',
      referencia_id: orden.id,
      referencia_tipo: 'OrdenProducto',
      lineas,
    });
  }

  async findOrdenes(limit = 50): Promise<OrdenProducto[]> {
    return this.ordenesRepo.find({
      relations: ['lineas', 'lineas.producto', 'vendedor'],
      order: { fecha_creacion: 'DESC' },
      take: limit,
    });
  }

  async findOrden(id: number): Promise<OrdenProducto> {
    const o = await this.ordenesRepo.findOne({
      where: { id },
      relations: ['lineas', 'lineas.producto', 'vendedor'],
    });
    if (!o) throw new NotFoundException(`Orden #${id} no encontrada.`);
    return o;
  }

  async anularOrden(id: number): Promise<OrdenProducto> {
    const orden = await this.findOrden(id);
    if (orden.estado === 'Anulada') throw new BadRequestException('La orden ya está anulada.');

    // Devolver stock
    for (const l of orden.lineas) {
      await this.productosRepo.increment({ id: l.producto.id }, 'stock', l.cantidad);
    }
    // Reversar el asiento de la venta (ingreso, IVA y costo) para no dejar movimientos fantasma
    await this.contabilidad
      .reversarAsientosPorReferencia('OrdenProducto', orden.id, undefined, 'Anulación de orden')
      .catch(() => { /* no bloquear la anulación */ });
    orden.estado = 'Anulada';
    return this.ordenesRepo.save(orden);
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────

  async getStats() {
    const totalProductos = await this.productosRepo.count({ where: { activo: true } });
    const stockBajo = await this.getStockBajo();
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const ventasMes = await this.ordenesRepo
      .createQueryBuilder('o')
      .where('o.estado = :estado', { estado: 'Completada' })
      .andWhere('o.fecha_creacion >= :inicio', { inicio: startOfMonth })
      .select('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'count')
      .getRawOne();

    return {
      totalProductos,
      stockBajoCount: stockBajo.length,
      stockBajo: stockBajo.slice(0, 5),
      ventasMesTotal: Number(ventasMes?.total ?? 0),
      ventasMesCount: Number(ventasMes?.count ?? 0),
    };
  }
}
