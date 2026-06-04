import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Asistencia, TipoMarcaje } from './asistencia.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AsistenciaService {
  constructor(
    @InjectRepository(Asistencia)
    private repo: Repository<Asistencia>,
  ) {}

  async marcar(
    user: User,
    tipo: TipoMarcaje,
    ubicacion?: string,
    nota?: string,
  ): Promise<Asistencia> {
    const registro = this.repo.create({ tipo, usuario: user, ubicacion, nota });
    return this.repo.save(registro);
  }

  /** Estado de hoy para el widget */
  async estadoHoy(user: User): Promise<{
    ultimo: Asistencia | null;
    entradas: number;
    salidas: number;
    enAlmuerzo: boolean;
  }> {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(); fin.setHours(23, 59, 59, 999);

    const registros = await this.repo.find({
      where: { usuario: { id: user.id }, fecha_hora: Between(inicio, fin) },
      relations: ['usuario'],
      order: { fecha_hora: 'DESC' },
    });

    const ultimo = registros[0] ?? null;
    const enAlmuerzo = ultimo?.tipo === 'almuerzo_inicio';

    return {
      ultimo,
      entradas: registros.filter(r => r.tipo === 'entrada').length,
      salidas:  registros.filter(r => r.tipo === 'salida').length,
      enAlmuerzo,
    };
  }

  async miHistorial(user: User, startDate: string, endDate: string): Promise<Asistencia[]> {
    return this.repo.find({
      where: {
        usuario: { id: user.id },
        fecha_hora: Between(
          new Date(`${startDate}T00:00:00`),
          new Date(`${endDate}T23:59:59`),
        ),
      },
      relations: ['usuario'],
      order: { fecha_hora: 'ASC' },
    });
  }

  async reporteDia(fecha: string): Promise<Asistencia[]> {
    const inicio = new Date(`${fecha}T00:00:00`);
    const fin    = new Date(`${fecha}T23:59:59`);
    return this.repo.find({
      where: { fecha_hora: Between(inicio, fin) },
      relations: ['usuario'],
      order: { fecha_hora: 'ASC' },
    });
  }

  /**
   * Admin: retorna lista de empleados que están DENTRO del trabajo ahora mismo.
   * "Dentro" = marcó entrada hoy y su último marcaje no es 'salida'.
   */
  async conectadosHoy(): Promise<{
    id: number;
    nombre: string;
    rol: string;
    desde: string;       // hora de primera entrada
    estado: 'trabajando' | 'almuerzo';
  }[]> {
    // Costa Rica = UTC-6 (sin horario de verano)
    const ahora  = new Date();
    const offset = -6 * 60; // minutos
    const crNow  = new Date(ahora.getTime() + (offset - ahora.getTimezoneOffset()) * 60000);
    const inicio = new Date(crNow); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(crNow); fin.setHours(23, 59, 59, 999);
    // Convertir de vuelta a UTC para la consulta
    const inicioUTC = new Date(inicio.getTime() - (offset - ahora.getTimezoneOffset()) * 60000);
    const finUTC    = new Date(fin.getTime()    - (offset - ahora.getTimezoneOffset()) * 60000);

    const registros = await this.repo.find({
      where: { fecha_hora: Between(inicioUTC, finUTC) },
      relations: ['usuario', 'usuario.rol'],
      order: { fecha_hora: 'ASC' },
    });

    // Agrupar por usuario
    const mapaUsuario = new Map<number, {
      nombre: string; rol: string;
      primeraEntrada: Date | null;
      ultimo: string;
    }>();

    for (const r of registros) {
      if (!r.usuario) continue;
      // Ocultar cuentas de sistema
      if ((r.usuario as any).es_sistema) continue;
      const uid = r.usuario.id;
      if (!mapaUsuario.has(uid)) {
        mapaUsuario.set(uid, {
          nombre: r.usuario.nombre_completo,
          rol: r.usuario.rol?.nombre || '',
          primeraEntrada: null,
          ultimo: r.tipo,
        });
      }
      const entry = mapaUsuario.get(uid)!;
      if (r.tipo === 'entrada' && !entry.primeraEntrada) {
        entry.primeraEntrada = new Date(r.fecha_hora);
      }
      entry.ultimo = r.tipo;
    }

    const resultado: { id: number; nombre: string; rol: string; desde: string; estado: 'trabajando' | 'almuerzo' }[] = [];
    for (const [id, data] of mapaUsuario.entries()) {
      // Solo si el último marcaje NO es 'salida'
      if (data.ultimo !== 'salida' && data.primeraEntrada) {
        resultado.push({
          id,
          nombre: data.nombre,
          rol: data.rol,
          desde: data.primeraEntrada.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
          estado: data.ultimo === 'almuerzo_inicio' ? 'almuerzo' : 'trabajando',
        });
      }
    }

    return resultado;
  }

  async reporteRango(startDate: string, endDate: string): Promise<any[]> {
    const registros = await this.repo.find({
      where: {
        fecha_hora: Between(
          new Date(`${startDate}T00:00:00`),
          new Date(`${endDate}T23:59:59`),
        ),
      },
      relations: ['usuario'],
      order: { fecha_hora: 'ASC' },
    });

    // Agrupar por usuario + día
    const map = new Map<string, {
      nombre: string;
      fecha: string;
      registros: { tipo: TipoMarcaje; hora: Date }[];
    }>();

    for (const r of registros) {
      if (!r.usuario || (r.usuario as any).es_sistema) continue;
      const fecha = new Date(r.fecha_hora).toISOString().split('T')[0];
      const key   = `${r.usuario.id}_${fecha}`;
      if (!map.has(key)) {
        map.set(key, { nombre: r.usuario.nombre_completo, fecha, registros: [] });
      }
      map.get(key)!.registros.push({ tipo: r.tipo, hora: new Date(r.fecha_hora) });
    }

    return Array.from(map.values()).map(({ nombre, fecha, registros }) => {
      // Calcular minutos trabajados excluyendo almuerzo
      let minutosTrabajados = 0;
      let minutosAlmuerzo   = 0;
      let ultimaEntrada: Date | null = null;
      let ultimoAlmuerzoInicio: Date | null = null;
      let primeraEntrada: Date | null = null;
      let ultimaSalida: Date | null = null;

      for (const r of registros) {
        switch (r.tipo) {
          case 'entrada':
            ultimaEntrada = r.hora;
            if (!primeraEntrada) primeraEntrada = r.hora;
            break;
          case 'almuerzo_inicio':
            if (ultimaEntrada) {
              minutosTrabajados += (r.hora.getTime() - ultimaEntrada.getTime()) / 60000;
              ultimaEntrada = null;
            }
            ultimoAlmuerzoInicio = r.hora;
            break;
          case 'almuerzo_fin':
            if (ultimoAlmuerzoInicio) {
              minutosAlmuerzo += (r.hora.getTime() - ultimoAlmuerzoInicio.getTime()) / 60000;
              ultimoAlmuerzoInicio = null;
            }
            ultimaEntrada = r.hora; // retoma desde aquí
            break;
          case 'salida':
            if (ultimaEntrada) {
              minutosTrabajados += (r.hora.getTime() - ultimaEntrada.getTime()) / 60000;
              ultimaEntrada = null;
            }
            ultimaSalida = r.hora;
            break;
        }
      }

      const fmt = (d: Date | null) =>
        d ? d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }) : '—';

      return {
        nombre,
        fecha,
        entradas: registros.filter(r => r.tipo === 'entrada').length,
        salidas:  registros.filter(r => r.tipo === 'salida').length,
        almuerzo: minutosAlmuerzo > 0 ? `${Math.round(minutosAlmuerzo)} min` : '—',
        horas_trabajadas: (minutosTrabajados / 60).toFixed(2),
        primera_entrada: fmt(primeraEntrada),
        ultima_salida:   fmt(ultimaSalida),
      };
    });
  }
}
