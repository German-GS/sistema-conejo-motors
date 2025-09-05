// backend/crs / recibos_pago / planilla - calculation.service.ts;
import { Injectable } from '@nestjs/common';
import { PlanillaParametrosService } from '../planilla-parametros/planilla-parametros.service';
import { User } from '../users/user.entity';
import { PlanillaParametro } from '../planilla-parametros/entities/planilla-parametro.entity';

@Injectable()
export class PlanillaCalculationService {
  constructor(private parametrosService: PlanillaParametrosService) {}

  async calculatePayroll(salarioBruto: number, user: User) {
    const allParams = await this.parametrosService.findAll();

    // --- 1. CÁLCULOS DEL EMPLEADO ---
    const deduccionesEmpleado = this.calculateDeduccionesEmpleado(
      salarioBruto,
      allParams,
      user,
    );

    // --- 2. CÁLCULOS DEL PATRONO ---
    const cargasPatronales = this.calculateCargasPatronales(
      salarioBruto,
      allParams,
    );

    // --- 3. RESUMEN FINAL ---
    const costoTotalParaEmpresa = salarioBruto + cargasPatronales.totalCargas;

    return {
      salarioBruto,
      costoTotalParaEmpresa,
      resumenEmpleado: {
        salarioNeto: deduccionesEmpleado.salarioNeto,
        totalDeducciones: deduccionesEmpleado.totalDeducciones,
        desglose: deduccionesEmpleado.desglose,
      },
      resumenPatrono: {
        totalCargas: cargasPatronales.totalCargas,
        desglose: cargasPatronales.desglose,
      },
    };
  }

  // --- MÉTODO FALTANTE AÑADIDO ---
  private calculateDeduccionesEmpleado(
    salarioBruto: number,
    params: PlanillaParametro[],
    user: User,
  ) {
    const getParam = (nombre: string) =>
      parseFloat((params.find((p) => p.nombre === nombre)?.valor as any) || 0);

    const desglose = {
      sem: salarioBruto * (getParam('DEDUCCION_OBRERO_SEM') / 100),
      ivm: salarioBruto * (getParam('DEDUCCION_OBRERO_IVM') / 100),
      bancoPopular: salarioBruto * (getParam('DEDUCCION_BANCO_POPULAR') / 100),
      renta: 0,
    };

    const totalDeduccionesFijas =
      desglose.sem + desglose.ivm + desglose.bancoPopular;

    const baseImponibleRenta = salarioBruto - (desglose.sem + desglose.ivm);

    let impuestoCalculado = 0;
    const tramo1 = getParam('RENTA_TRAMO_1_LIMITE');
    const tramo2 = getParam('RENTA_TRAMO_2_LIMITE');
    const tramo3 = getParam('RENTA_TRAMO_3_LIMITE');
    const tramo4 = getParam('RENTA_TRAMO_4_LIMITE');

    if (baseImponibleRenta > tramo1) {
      const montoEnTramo = Math.min(baseImponibleRenta, tramo2) - tramo1;
      impuestoCalculado +=
        montoEnTramo * (getParam('RENTA_TRAMO_2_PORCENTAJE') / 100);
    }
    if (baseImponibleRenta > tramo2) {
      const montoEnTramo = Math.min(baseImponibleRenta, tramo3) - tramo2;
      impuestoCalculado +=
        montoEnTramo * (getParam('RENTA_TRAMO_3_PORCENTAJE') / 100);
    }
    if (baseImponibleRenta > tramo3) {
      const montoEnTramo = Math.min(baseImponibleRenta, tramo4) - tramo3;
      impuestoCalculado +=
        montoEnTramo * (getParam('RENTA_TRAMO_4_PORCENTAJE') / 100);
    }
    if (baseImponibleRenta > tramo4) {
      const montoEnTramo = baseImponibleRenta - tramo4;
      impuestoCalculado +=
        montoEnTramo * (getParam('RENTA_TRAMO_5_PORCENTAJE') / 100);
    }

    const creditoConyuge = user.tiene_conyuge
      ? getParam('RENTA_CREDITO_CONYUGE')
      : 0;
    const creditoHijos = user.cantidad_hijos * getParam('RENTA_CREDITO_HIJO');
    const creditosFamiliares = creditoConyuge + creditoHijos;

    desglose.renta = Math.max(0, impuestoCalculado - creditosFamiliares);

    const totalDeducciones = totalDeduccionesFijas + desglose.renta;
    const salarioNeto = salarioBruto - totalDeducciones;

    return { salarioNeto, totalDeducciones, desglose };
  }

  // --- MÉTODO FALTANTE AÑADIDO ---
  private calculateCargasPatronales(
    salarioBruto: number,
    params: PlanillaParametro[],
  ) {
    const cargasParams = params.filter((p) => p.tipo === 'CARGA_PATRONAL');
    const desglose: { [key: string]: number } = {};
    let totalCargas = 0;

    for (const param of cargasParams) {
      const monto = salarioBruto * (parseFloat(param.valor.toString()) / 100);
      desglose[param.nombre] = monto;
      totalCargas += monto;
    }

    return { totalCargas, desglose };
  }
}
