import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivoFijo } from '../activos-fijos/activo-fijo.entity';
import { LiquidacionIVA } from '../iva/liquidacion-iva.entity';

export interface DocumentoPendiente {
  origen: string;
  id: number;
  descripcion: string;
  fecha: string | null;
  error: string | null;
}

/**
 * Reúne los documentos cuyo asiento contable falló al postearse y quedaron marcados
 * con `pendiente_contabilizar = true`, para reconciliación manual/reintento.
 */
@Injectable()
export class PendientesContablesService {
  constructor(
    @InjectRepository(ActivoFijo) private activosRepo: Repository<ActivoFijo>,
    @InjectRepository(LiquidacionIVA) private ivaRepo: Repository<LiquidacionIVA>,
  ) {}

  async listar(): Promise<{ total: number; documentos: DocumentoPendiente[] }> {
    const activos = await this.activosRepo.find({ where: { pendiente_contabilizar: true } });
    const liquidaciones = await this.ivaRepo.find({ where: { pendiente_contabilizar: true } });

    const documentos: DocumentoPendiente[] = [
      ...activos.map((a) => ({
        origen: 'ActivoFijo',
        id: a.id,
        descripcion: a.nombre,
        fecha: a.fecha_adquisicion,
        error: a.error_contable,
      })),
      ...liquidaciones.map((l) => ({
        origen: 'LiquidacionIVA',
        id: l.id,
        descripcion: `Liquidación IVA ${l.periodo}`,
        fecha: l.fecha_generacion,
        error: l.error_contable,
      })),
    ];

    return { total: documentos.length, documentos };
  }
}
