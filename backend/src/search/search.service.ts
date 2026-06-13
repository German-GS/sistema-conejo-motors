import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Factura } from '../facturacion/factura.entity';

export interface SearchResult {
  tipo: 'vehiculo' | 'cliente' | 'cotizacion' | 'factura';
  id: number;
  titulo: string;
  subtitulo: string;
  icono: string;
  ruta: string;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Cliente) private clientesRepo: Repository<Cliente>,
    @InjectRepository(Cotizacion) private cotizacionesRepo: Repository<Cotizacion>,
    @InjectRepository(Factura) private facturasRepo: Repository<Factura>,
  ) {}

  async buscar(qRaw: string): Promise<SearchResult[]> {
    const q = (qRaw ?? '').trim();
    if (q.length < 2) return [];
    const like = `%${q}%`;
    const esNumero = /^\d+$/.test(q);
    const resultados: SearchResult[] = [];

    // ── Vehículos: VIN, marca, modelo ────────────────────────────────────────
    const vehiculos = await this.vehiclesRepo.find({
      where: [{ vin: ILike(like) }, { marca: ILike(like) }, { modelo: ILike(like) }],
      take: 6,
      order: { id: 'DESC' },
    });
    for (const v of vehiculos) {
      resultados.push({
        tipo: 'vehiculo',
        id: v.id,
        titulo: `${v.marca} ${v.modelo} ${v.año ?? ''}`.trim(),
        subtitulo: `VIN ${v.vin} · ${v.estado}`,
        icono: '🚗',
        ruta: `/admin/sales/catalog/${v.id}`,
      });
    }

    // ── Clientes: nombre, cédula, teléfono, email ────────────────────────────
    const clientes = await this.clientesRepo.find({
      where: [
        { nombre_completo: ILike(like) },
        { cedula: ILike(like) },
        { telefono: ILike(like) },
        { email: ILike(like) },
      ],
      take: 6,
      order: { id: 'DESC' },
    });
    for (const c of clientes) {
      // Ruta: su cotización más reciente; si no tiene, la lista de leads
      const ultimaCot = await this.cotizacionesRepo.findOne({
        where: { cliente: { id: c.id } },
        order: { id: 'DESC' },
      });
      resultados.push({
        tipo: 'cliente',
        id: c.id,
        titulo: c.nombre_completo,
        subtitulo: `Cédula ${c.cedula}${c.telefono ? ` · ${c.telefono}` : ''}`,
        icono: '👤',
        ruta: ultimaCot ? `/admin/sales/quotes/${ultimaCot.id}` : `/admin/leads`,
      });
    }

    // ── Cotizaciones: por # o por nombre de cliente ──────────────────────────
    const cotQuery = this.cotizacionesRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.cliente', 'cliente')
      .leftJoinAndSelect('c.vehiculo', 'vehiculo')
      .orderBy('c.id', 'DESC')
      .take(6);
    if (esNumero) {
      cotQuery.where('c.id = :id', { id: Number(q) });
    } else {
      cotQuery.where('cliente.nombre_completo ILIKE :like', { like });
    }
    const cotizaciones = await cotQuery.getMany();
    for (const c of cotizaciones) {
      resultados.push({
        tipo: 'cotizacion',
        id: c.id,
        titulo: `Cotización #${c.id}`,
        subtitulo: `${c.cliente?.nombre_completo ?? 'Sin cliente'} · ${c.estado}`,
        icono: '📄',
        ruta: `/admin/sales/quotes/${c.id}`,
      });
    }

    // ── Facturas: por consecutivo o clave numérica ───────────────────────────
    const facturas = await this.facturasRepo.find({
      where: [{ consecutivo: ILike(like) }, { clave_numerica: ILike(like) }],
      take: 6,
      order: { id: 'DESC' },
    });
    for (const f of facturas) {
      resultados.push({
        tipo: 'factura',
        id: f.id,
        titulo: `Factura ${f.consecutivo}`,
        subtitulo: `Estado: ${f.estado}`,
        icono: '🧾',
        ruta: `/admin/billing`,
      });
    }

    return resultados;
  }
}
