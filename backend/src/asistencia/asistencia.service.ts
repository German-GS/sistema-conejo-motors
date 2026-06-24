import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Asistencia, TipoMarcaje } from './asistencia.entity';
import { User } from '../users/user.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Interpreta una fecha/hora que viene de un input datetime-local (sin zona)
 * como hora de Costa Rica (UTC-6). Si ya trae zona (Z o ±hh:mm), se respeta.
 */
function parseFechaCR(s: string): Date {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  const conSegundos = s.length === 16 ? `${s}:00` : s; // "YYYY-MM-DDTHH:mm" → +":00"
  return new Date(`${conSegundos}-06:00`);
}

@Injectable()
export class AsistenciaService {
  private readonly logger = new Logger(AsistenciaService.name);

  constructor(
    @InjectRepository(Asistencia)
    private repo: Repository<Asistencia>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    private notificationsService: NotificationsService,
  ) {}

  /** Admin: elimina un marcaje y lo registra en el log de auditoría */
  async adminEliminarMarcaje(id: number, admin: User): Promise<{ ok: boolean }> {
    if (admin.rol?.nombre !== 'Administrador') {
      throw new ForbiddenException('Solo el administrador puede eliminar marcajes.');
    }
    const registro = await this.repo.findOne({ where: { id }, relations: ['usuario'] });
    if (!registro) throw new NotFoundException(`Marcaje #${id} no encontrado.`);

    const hora = registro.fecha_hora
      ? new Date(registro.fecha_hora).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })
      : '—';
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        usuario: { id: admin.id } as User,
        accion: 'ELIMINAR_MARCAJE_ASISTENCIA',
        detalles: `Marcaje #${id} (${registro.tipo}) de ${registro.usuario?.nombre_completo ?? 'usuario ' + (registro.usuario as any)?.id} del ${hora}. Nota: ${registro.nota ?? '—'}`,
      }),
    );

    await this.repo.delete(id);
    return { ok: true };
  }

  async marcar(
    user: User,
    tipo: TipoMarcaje,
    ubicacion?: string,
    nota?: string,
  ): Promise<Asistencia> {
    const registro = this.repo.create({ tipo, usuario: user, ubicacion, nota });
    return this.repo.save(registro);
  }

  /** Retorna usuarios con entrada activa hoy (sin salida registrada) */
  private async getUsuariosConEntradaActiva(): Promise<User[]> {
    const ahora   = new Date();
    const offset  = -6 * 60;
    const crNow   = new Date(ahora.getTime() + (offset - ahora.getTimezoneOffset()) * 60000);
    const inicioCR = new Date(crNow); inicioCR.setHours(0, 0, 0, 0);
    const finCR    = new Date(crNow); finCR.setHours(23, 59, 59, 999);
    const inicioUTC = new Date(inicioCR.getTime() - (offset - ahora.getTimezoneOffset()) * 60000);
    const finUTC    = new Date(finCR.getTime()    - (offset - ahora.getTimezoneOffset()) * 60000);

    const registros = await this.repo.find({
      where: { fecha_hora: Between(inicioUTC, finUTC) },
      relations: ['usuario', 'usuario.rol'],
      order: { fecha_hora: 'ASC' },
    });

    // Agrupar por usuario, encontrar quienes no tienen salida como último marcaje
    const mapaUltimo = new Map<number, { user: User; ultimo: string }>();
    for (const r of registros) {
      if (!r.usuario || (r.usuario as any).es_sistema) continue;
      mapaUltimo.set(r.usuario.id, { user: r.usuario, ultimo: r.tipo });
    }

    return Array.from(mapaUltimo.values())
      .filter(e => e.ultimo !== 'salida')
      .map(e => e.user);
  }

  // ── CRONS DE RECORDATORIO (hora Costa Rica = UTC-6) ──────────────────
  // 4:00pm CR = 22:00 UTC | 4:30pm = 22:30 | 5:00pm = 23:00 | 5:30pm = 23:30

  @Cron('0 22 * * 1-6', { timeZone: 'UTC' })
  async recordatorio400() { await this._enviarRecordatorios(); }

  @Cron('30 22 * * 1-6', { timeZone: 'UTC' })
  async recordatorio430() { await this._enviarRecordatorios(); }

  @Cron('0 23 * * 1-6', { timeZone: 'UTC' })
  async recordatorio500() { await this._enviarRecordatorios(); }

  @Cron('30 23 * * 1-6', { timeZone: 'UTC' })
  async recordatorio530() { await this._enviarRecordatorios(); }

  private async _enviarRecordatorios(): Promise<void> {
    try {
      const usuarios = await this.getUsuariosConEntradaActiva();
      for (const u of usuarios) {
        await this.notificationsService.createForUser(
          u,
          '⏰ Recordatorio: no olvides marcar tu salida antes de irte.',
          '/asistencia',
        );
      }
      if (usuarios.length) this.logger.log(`Recordatorio salida enviado a ${usuarios.length} usuario(s).`);
    } catch (e) {
      this.logger.error('Error enviando recordatorios de salida', (e as Error).message);
    }
  }

  // ── AUTO-CIERRE 8:00pm CR = 02:00 UTC ────────────────────────────────
  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async autoCierreSalida(): Promise<void> {
    try {
      const usuarios = await this.getUsuariosConEntradaActiva();
      for (const u of usuarios) {
        const registro = this.repo.create({
          tipo: 'salida',
          usuario: u,
          es_auto_cierre: true,
          nota: 'Salida registrada automáticamente por el sistema — pendiente revisión del administrador.',
        });
        await this.repo.save(registro);
        await this.notificationsService.createForUser(
          u,
          '⚠️ Tu salida fue registrada automáticamente. Coordiná con el administrador si la hora es incorrecta.',
          '/asistencia',
        );
      }
      if (usuarios.length) {
        await this.notificationsService.createForRoles(
          ['Administrador'],
          `⚠️ ${usuarios.length} colaborador(es) no marcaron salida hoy. Revisa y corrige en Control de Asistencia.`,
          '/admin/asistencia?tab=pendientes',
        );
        this.logger.log(`Auto-cierre aplicado a ${usuarios.length} usuario(s).`);
      }
    } catch (e) {
      this.logger.error('Error en auto-cierre de asistencia', (e as Error).message);
    }
  }

  /** Admin: lista de cierres automáticos pendientes de revisión */
  async getSinSalida(): Promise<Asistencia[]> {
    return this.repo.find({
      where: { tipo: 'salida', es_auto_cierre: true },
      relations: ['usuario', 'modificado_por'],
      order: { fecha_hora: 'DESC' },
    });
  }

  /** Admin: agregar manualmente un marcaje (ej. salida olvidada) con hora específica */
  async adminAgregarMarcaje(
    usuarioId: number,
    tipo: TipoMarcaje,
    fechaHoraISO: string,
    admin: User,
    nota?: string,
  ): Promise<Asistencia> {
    if (admin.rol?.nombre !== 'Administrador') {
      throw new ForbiddenException('Solo el administrador puede agregar marcajes.');
    }
    const usuario = await this.usersRepo.findOneBy({ id: usuarioId });
    if (!usuario) throw new NotFoundException(`Colaborador #${usuarioId} no encontrado.`);

    const registro = this.repo.create({
      tipo,
      usuario,
      nota: `${tipo === 'salida' ? 'Salida' : 'Marcaje'} agregado por administrador`,
      nota_admin: nota,
      modificado_por: admin,
    });
    const saved = await this.repo.save(registro);
    // fecha_hora es CreateDateColumn (se pone "ahora" al insertar); la forzamos con un update
    const fecha = parseFechaCR(fechaHoraISO);
    await this.repo.update(saved.id, { fecha_hora: fecha });

    await this.notificationsService.createForUser(
      usuario,
      `✅ El administrador registró tu ${tipo} del ${fecha.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}.`,
      '/asistencia',
    );

    return this.repo.findOne({ where: { id: saved.id }, relations: ['usuario'] }) as Promise<Asistencia>;
  }

  /** Admin: corregir hora de un marcaje (solo admin, con auditoría) */
  async adminCorregir(
    id: number,
    nuevaHoraISO: string,
    admin: User,
    notaAdmin: string,
  ): Promise<Asistencia> {
    const registro = await this.repo.findOne({ where: { id }, relations: ['usuario'] });
    if (!registro) throw new NotFoundException(`Marcaje #${id} no encontrado.`);
    if (admin.rol?.nombre !== 'Administrador') throw new ForbiddenException('Solo el administrador puede corregir marcajes.');

    const fecha = parseFechaCR(nuevaHoraISO);
    registro.hora_original   = registro.hora_original ?? registro.fecha_hora;
    registro.fecha_hora      = fecha;
    registro.nota_admin      = notaAdmin;
    registro.modificado_por  = admin;
    registro.es_auto_cierre  = false; // ya fue revisado

    const saved = await this.repo.save(registro);

    // Notificar al empleado
    await this.notificationsService.createForUser(
      registro.usuario,
      `✅ El administrador corrigió tu salida del ${fecha.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}.`,
      '/asistencia',
    );

    return saved;
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

  // (límites de período en hora de Costa Rica)
  async miHistorial(user: User, startDate: string, endDate: string): Promise<Asistencia[]> {
    return this.repo.find({
      where: {
        usuario: { id: user.id },
        fecha_hora: Between(
          new Date(`${startDate}T00:00:00-06:00`),
          new Date(`${endDate}T23:59:59-06:00`),
        ),
      },
      relations: ['usuario'],
      order: { fecha_hora: 'ASC' },
    });
  }

  async reporteDia(fecha: string): Promise<Asistencia[]> {
    // Límites del día en hora de Costa Rica (UTC-6)
    const inicio = new Date(`${fecha}T00:00:00-06:00`);
    const fin    = new Date(`${fecha}T23:59:59-06:00`);
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
    puesto?: string;
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
      nombre: string; rol: string; puesto?: string;
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
          puesto: r.usuario.puesto ?? undefined,
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

    const resultado: { id: number; nombre: string; rol: string; puesto?: string; desde: string; estado: 'trabajando' | 'almuerzo' }[] = [];
    for (const [id, data] of mapaUsuario.entries()) {
      // Solo si el último marcaje NO es 'salida'
      if (data.ultimo !== 'salida' && data.primeraEntrada) {
        resultado.push({
          id,
          nombre: data.nombre,
          rol: data.rol,
          puesto: data.puesto,
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
          new Date(`${startDate}T00:00:00-06:00`),
          new Date(`${endDate}T23:59:59-06:00`),
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
      const fecha = new Date(r.fecha_hora).toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
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
