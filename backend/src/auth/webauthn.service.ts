import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { User } from '../users/user.entity';
import { PasskeyCredential } from './passkey-credential.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const RP_NAME = 'Conejo Motors';
const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'sistema.conejomotors.com';
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'https://sistema.conejomotors.com';
const ROLES_PERMITIDOS = ['Administrador', 'Contador'];

@Injectable()
export class WebAuthnService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(PasskeyCredential) private passkeyRepo: Repository<PasskeyCredential>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  private assertRolPermitido(user: User) {
    if (!ROLES_PERMITIDOS.includes(user.rol?.nombre)) {
      throw new ForbiddenException('Las passkeys están disponibles solo para Administrador y Contador.');
    }
  }

  private transportsArr(c: PasskeyCredential): any[] {
    return c.transports ? (c.transports.split(',').filter(Boolean) as any[]) : [];
  }

  // ── Registro (usuario autenticado) ─────────────────────────────────────────
  async opcionesRegistro(userId: number) {
    const user = await this.usersService.findOneByIdFull(userId);
    this.assertRolPermitido(user);
    const existentes = await this.passkeyRepo.find({ where: { usuario: { id: userId } } });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: user.email,
      userID: Buffer.from(String(user.id)),
      userDisplayName: user.nombre_completo,
      attestationType: 'none',
      excludeCredentials: existentes.map((c) => ({ id: c.credential_id, transports: this.transportsArr(c) })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });

    await this.usersRepo.update(userId, { webauthn_challenge: options.challenge });
    return options;
  }

  async verificarRegistro(userId: number, response: any, deviceName?: string) {
    const user = await this.usersService.findOneByIdFull(userId);
    this.assertRolPermitido(user);
    const challenge = (await this.usersRepo.findOne({ where: { id: userId }, select: ['id', 'webauthn_challenge'] }))?.webauthn_challenge;
    if (!challenge) throw new BadRequestException('No hay un registro de passkey en curso.');

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('No se pudo verificar la passkey.');
    }

    const cred = verification.registrationInfo.credential;
    await this.passkeyRepo.save(this.passkeyRepo.create({
      credential_id: cred.id,
      public_key: Buffer.from(cred.publicKey).toString('base64'),
      counter: String(cred.counter ?? 0),
      transports: (cred.transports ?? []).join(',') || null,
      device_name: deviceName?.slice(0, 100) || null,
      usuario: { id: userId } as any,
    }));
    await this.usersRepo.update(userId, { webauthn_challenge: null });
    return { ok: true };
  }

  // ── Gestión ────────────────────────────────────────────────────────────────
  async listar(userId: number) {
    const creds = await this.passkeyRepo.find({ where: { usuario: { id: userId } }, order: { creado_en: 'DESC' } });
    return creds.map((c) => ({ id: c.id, device_name: c.device_name, creado_en: c.creado_en }));
  }

  async eliminar(userId: number, id: number) {
    const res = await this.passkeyRepo.delete({ id, usuario: { id: userId } });
    if (!res.affected) throw new NotFoundException('Passkey no encontrada.');
    return { ok: true };
  }

  // ── Login por passkey (público) ─────────────────────────────────────────────
  async opcionesLogin(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user || !ROLES_PERMITIDOS.includes(user.rol?.nombre)) {
      throw new BadRequestException('Este usuario no puede iniciar sesión con passkey.');
    }
    const creds = await this.passkeyRepo.find({ where: { usuario: { id: user.id } } });
    if (!creds.length) throw new BadRequestException('Este usuario no tiene passkeys registradas.');

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: creds.map((c) => ({ id: c.credential_id, transports: this.transportsArr(c) })),
      userVerification: 'preferred',
    });
    await this.usersRepo.update(user.id, { webauthn_challenge: options.challenge });
    return options;
  }

  async verificarLogin(email: string, response: any) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas.');
    const cred = await this.passkeyRepo.findOne({ where: { credential_id: response?.id, usuario: { id: user.id } } });
    if (!cred) throw new UnauthorizedException('Passkey no reconocida.');
    const challenge = (await this.usersRepo.findOne({ where: { id: user.id }, select: ['id', 'webauthn_challenge'] }))?.webauthn_challenge;
    if (!challenge) throw new BadRequestException('No hay un login de passkey en curso.');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: cred.credential_id,
        publicKey: Buffer.from(cred.public_key, 'base64'),
        counter: Number(cred.counter),
        transports: this.transportsArr(cred),
      },
    });
    if (!verification.verified) throw new UnauthorizedException('No se pudo verificar la passkey.');

    await this.passkeyRepo.update(cred.id, { counter: String(verification.authenticationInfo.newCounter) });
    await this.usersRepo.update(user.id, { webauthn_challenge: null });
    // Emite el mismo JWT que el login normal (incluye el rol).
    return this.authService.login(user);
  }
}
