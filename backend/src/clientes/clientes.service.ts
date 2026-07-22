import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { Lead } from '../leads/lead.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Venta } from '../ventas/venta.entity';
import { SugefService } from '../sugef/sugef.service';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    private sugefService: SugefService,
  ) {}

  // Busca un cliente por cédula y, si no existe, lo crea (usado por cotizaciones).
  async findOrCreate(createClienteDto: CreateClienteDto): Promise<Cliente> {
    let cliente = await this.clientesRepository.findOneBy({
      cedula: createClienteDto.cedula,
    });
    if (!cliente) {
      cliente = this.clientesRepository.create(createClienteDto);
      await this.clientesRepository.save(cliente);
    }
    return cliente;
  }

  /**
   * Lista de clientes = LEADS (la info del cliente vive en el lead, y un lead
   * agrupa varias cotizaciones). Con conteo de cotizaciones y vehículos comprados.
   */
  async listar(): Promise<any[]> {
    const leads = await this.leadsRepository.find({ order: { nombre_cliente: 'ASC' } });

    const cots = await this.cotizacionesRepository.find({ relations: ['lead'] });
    const cotPorLead = new Map<number, number>();
    for (const c of cots) {
      const lid = (c as any).lead?.id;
      if (lid) cotPorLead.set(lid, (cotPorLead.get(lid) ?? 0) + 1);
    }

    const ventas = await this.ventasRepository.find({ relations: ['cotizacion', 'cotizacion.lead'] });
    const vehPorLead = new Map<number, number>();
    for (const v of ventas) {
      const lid = v.cotizacion?.lead?.id;
      if (lid) vehPorLead.set(lid, (vehPorLead.get(lid) ?? 0) + 1);
    }

    return leads.map((l) => ({
      id: l.id,
      nombre_completo: l.nombre_cliente,
      cedula: l.cedula_cliente,
      telefono: l.telefono_cliente,
      email: l.email_cliente,
      estado: l.estado,
      cotizaciones: cotPorLead.get(l.id) ?? 0,
      vehiculos: vehPorLead.get(l.id) ?? 0,
    }));
  }

  /** Perfil del cliente (por lead): datos + vehículos comprados + expediente SUGEF */
  async perfil(leadId: number): Promise<any> {
    const lead = await this.leadsRepository.findOne({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Cliente (lead #${leadId}) no encontrado.`);

    const ventas = await this.ventasRepository.find({
      where: { cotizacion: { lead: { id: leadId } } } as any,
      relations: ['cotizacion', 'cotizacion.vehiculo'],
      order: { fecha_venta: 'DESC' },
    });
    const vehiculos = ventas.map((v) => ({
      ventaId: v.id,
      fecha_venta: v.fecha_venta,
      marca: v.cotizacion?.vehiculo?.marca,
      modelo: v.cotizacion?.vehiculo?.modelo,
      anio: (v.cotizacion?.vehiculo as any)?.año,
      vin: (v.cotizacion?.vehiculo as any)?.vin,
    }));

    // Lista de cotizaciones (proformas) del cliente, para verlas/abrirlas desde su perfil.
    const cots = await this.cotizacionesRepository.find({
      where: { lead: { id: leadId } } as any,
      relations: ['vehiculo'],
      order: { fecha_creacion: 'DESC' },
    });
    const cotizaciones = cots.map((c: any) => ({
      id: c.id,
      fecha: c.fecha_creacion,
      estado: c.estado,
      vehiculo: c.vehiculo ? `${c.vehiculo.marca ?? ''} ${c.vehiculo.modelo ?? ''} ${c.vehiculo.año ?? ''}`.trim() : (c.vehiculo_descripcion ?? '—'),
      total: Number(c.total_con_iva) || Number(c.precio_final) || 0,
    }));

    // Expediente SUGEF (directo del lead)
    const retencion = await this.sugefService.getRetencion(leadId);
    const kyc = await this.sugefService.getKyc(leadId);
    const expediente = {
      leadId,
      retencion,
      kyc,
      kycCompleto: this.sugefService.faltantesKyc(kyc).length === 0,
      bajoRetencion: await this.sugefService.estaBajoRetencion(leadId),
    };

    return {
      cliente: {
        leadId: lead.id,
        nombre_completo: lead.nombre_cliente,
        cedula: lead.cedula_cliente,
        telefono: lead.telefono_cliente,
        email: lead.email_cliente,
        estado: lead.estado,
        direccion: kyc?.direccion,
      },
      vehiculos,
      cotizaciones,
      expediente,
    };
  }
}
