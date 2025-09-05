import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanillaParametro } from './entities/planilla-parametro.entity';
import { UpdatePlanillaParametroDto } from './dto/update-planilla-parametro.dto';

@Injectable()
export class PlanillaParametrosService implements OnModuleInit {
  constructor(
    @InjectRepository(PlanillaParametro)
    private parametrosRepository: Repository<PlanillaParametro>,
  ) {}

  /**
   * Este método se ejecuta automáticamente cuando el módulo se inicia.
   * Llama a la función para sembrar los parámetros por defecto.
   */
  async onModuleInit() {
    await this.seedDefaultParameters();
  }

  /**
   * Sembrador de parámetros: Inserta los valores por defecto en la base de datos
   * solo si no existen previamente. Esto evita duplicados y errores.
   */
  private async seedDefaultParameters() {
    const defaultParams = [
      {
        nombre: 'DEDUCCION_OBRERO_SEM',
        valor: 5.5,
        descripcion: 'Deducción al empleado para SEM (CCSS).',
        tipo: 'DEDUCCION_EMPLEADO' as const,
      },
      {
        nombre: 'DEDUCCION_OBRERO_IVM',
        valor: 4.17,
        descripcion: 'Deducción al empleado para IVM (CCSS).',
        tipo: 'DEDUCCION_EMPLEADO' as const,
      },
      {
        nombre: 'DEDUCCION_BANCO_POPULAR',
        valor: 1.0,
        descripcion: 'Aporte del trabajador al Banco Popular.',
        tipo: 'DEDUCCION_EMPLEADO' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_SEM',
        valor: 9.25,
        descripcion: 'Aporte patronal al SEM (CCSS).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_IVM',
        valor: 5.42,
        descripcion: 'Aporte patronal al IVM (CCSS).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_FODESAF',
        valor: 5.0,
        descripcion: 'Aporte patronal a Asignaciones Familiares (FODESAF).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_INA',
        valor: 1.5,
        descripcion:
          'Aporte patronal al Instituto Nacional de Aprendizaje (INA).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_IMAS',
        valor: 0.5,
        descripcion:
          'Aporte patronal al Instituto Mixto de Ayuda Social (IMAS).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_BANCO_POPULAR_CUOTA',
        valor: 0.25,
        descripcion: 'Cuota patronal al Banco Popular.',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_ROP',
        valor: 2.0,
        descripcion:
          'Aporte patronal al Fondo de Pensiones Complementarias (ROP).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_FCL',
        valor: 1.5,
        descripcion:
          'Aporte patronal al Fondo de Capitalización Laboral (FCL).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_INS_RIESGOS',
        valor: 1.0,
        descripcion: 'Póliza de Riesgos del Trabajo (INS) - Promedio.',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'APORTE_PATRONAL_BANCO_POPULAR_LEY',
        valor: 0.25,
        descripcion: 'Aporte patronal al Banco Popular (Ley 7983).',
        tipo: 'CARGA_PATRONAL' as const,
      },
      {
        nombre: 'RENTA_TRAMO_1_LIMITE',
        valor: 922000,
        descripcion: 'Límite superior del tramo exento de renta.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_1_PORCENTAJE',
        valor: 0,
        descripcion: 'Porcentaje de impuesto para el tramo 1.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_2_LIMITE',
        valor: 1352000,
        descripcion: 'Límite superior del segundo tramo de renta.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_2_PORCENTAJE',
        valor: 10,
        descripcion: 'Porcentaje de impuesto para el tramo 2.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_3_LIMITE',
        valor: 2373000,
        descripcion: 'Límite superior del tercer tramo de renta.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_3_PORCENTAJE',
        valor: 15,
        descripcion: 'Porcentaje de impuesto para el tramo 3.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_4_LIMITE',
        valor: 4745000,
        descripcion: 'Límite superior del cuarto tramo de renta.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_4_PORCENTAJE',
        valor: 20,
        descripcion: 'Porcentaje de impuesto para el tramo 4.',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_TRAMO_5_PORCENTAJE',
        valor: 25,
        descripcion: 'Porcentaje de impuesto para el tramo 5 (exceso).',
        tipo: 'RENTA' as const,
      },
      {
        nombre: 'RENTA_CREDITO_HIJO',
        valor: 1720,
        descripcion: 'Crédito fiscal mensual por cada hijo.',
        tipo: 'CREDITO_FISCAL' as const,
      },
      {
        nombre: 'RENTA_CREDITO_CONYUGE',
        valor: 2600,
        descripcion: 'Crédito fiscal mensual por cónyuge.',
        tipo: 'CREDITO_FISCAL' as const,
      },
      {
        nombre: 'COMISION_VENDEDOR_PORC',
        valor: 5.0,
        descripcion: 'Porcentaje de Comisión para Vendedores (%)',
        tipo: 'COMISION' as const,
      },
    ];

    // Itera sobre cada parámetro y lo inserta solo si no existe
    for (const paramData of defaultParams) {
      const existingParam = await this.parametrosRepository.findOneBy({
        nombre: paramData.nombre,
      });
      if (!existingParam) {
        const newParam = this.parametrosRepository.create(paramData);
        await this.parametrosRepository.save(newParam);
        console.log(`Parámetro sembrado: ${paramData.nombre}`);
      }
    }
  }

  findAll() {
    return this.parametrosRepository.find();
  }

  findOne(id: number) {
    return this.parametrosRepository.findOneBy({ id });
  }

  async update(id: number, updateDto: UpdatePlanillaParametroDto) {
    const parametro = await this.parametrosRepository.findOneBy({ id });
    if (!parametro) {
      throw new NotFoundException(`Parámetro con ID #${id} no encontrado.`);
    }

    if (updateDto.valor !== undefined) {
      parametro.valor = updateDto.valor;
    }

    return this.parametrosRepository.save(parametro);
  }
  // 👇 AÑADIENDO LOS MÉTODOS QUE FALTABAN
  create() {
    // No implementamos la lógica, pero el método debe existir
    return 'La creación de nuevos parámetros no está permitida.';
  }

  remove(id: number) {
    // No implementamos la lógica, pero el método debe existir
    return `La eliminación del parámetro #${id} no está permitida.`;
  }
}
