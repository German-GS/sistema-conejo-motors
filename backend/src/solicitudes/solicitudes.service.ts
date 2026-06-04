import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitud } from './solicitud.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

const TIPO_LABELS: Record<string, string> = {
  dia_libre: 'día libre',
  vacaciones: 'vacaciones',
  salida_anticipada: 'salida anticipada',
  llegada_tarde: 'llegada tarde',
  permiso_personal: 'permiso personal',
  otro: 'permiso',
};

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private repo: Repository<Solicitud>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Empleado: crea nueva solicitud */
  async crear(user: User, body: Partial<Solicitud>): Promise<Solicitud> {
    const solicitud = this.repo.create({ ...body, empleado: user, estado: 'pendiente' });
    const saved = await this.repo.save(solicitud);

    // Notificar a todos los administradores
    const tipoLabel = TIPO_LABELS[body.tipo as string] || 'solicitud';
    await this.notificationsService.createForAdmins(
      `📋 ${user.nombre_completo} solicitó ${tipoLabel}`,
      '/admin/solicitudes',
    );

    return saved;
  }

  /** Empleado: sus propias solicitudes */
  async misSolicitudes(user: User): Promise<Solicitud[]> {
    return this.repo.find({
      where: { empleado: { id: user.id } },
      relations: ['empleado', 'revisado_por'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  /** Admin: todas las solicitudes */
  async todas(): Promise<Solicitud[]> {
    return this.repo.find({
      relations: ['empleado', 'revisado_por'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  /** Admin: pendientes */
  async pendientes(): Promise<Solicitud[]> {
    return this.repo.find({
      where: { estado: 'pendiente' },
      relations: ['empleado'],
      order: { fecha_creacion: 'ASC' },
    });
  }

  /** Admin: aprobar o rechazar */
  async resolver(
    id: number,
    admin: User,
    decision: 'aprobada' | 'rechazada',
    respuesta?: string,
  ): Promise<Solicitud> {
    const sol = await this.repo.findOne({ where: { id }, relations: ['empleado'] });
    if (!sol) throw new NotFoundException('Solicitud no encontrada.');
    if (sol.estado !== 'pendiente') throw new ForbiddenException('Esta solicitud ya fue procesada.');
    sol.estado = decision;
    sol.revisado_por = admin;
    sol.respuesta_admin = respuesta ?? '';
    return this.repo.save(sol);
  }
}
