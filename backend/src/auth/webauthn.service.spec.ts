import { WebAuthnService } from './webauthn.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('WebAuthnService — restricción de rol', () => {
  const build = (rolNombre: string) => {
    const usersService = {
      findOneByIdFull: jest.fn().mockResolvedValue({ id: 1, email: 'a@x.com', nombre_completo: 'A', rol: { nombre: rolNombre } }),
      findOneByEmail: jest.fn().mockResolvedValue({ id: 1, email: 'a@x.com', rol: { nombre: rolNombre } }),
    };
    const usersRepo = { update: jest.fn(), findOne: jest.fn() };
    const passkeyRepo = { find: jest.fn().mockResolvedValue([]) };
    return new WebAuthnService(usersRepo as any, passkeyRepo as any, usersService as any, {} as any);
  };

  it('un Vendedor NO puede registrar passkey', async () => {
    await expect(build('Vendedor').opcionesRegistro(1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un Vendedor NO puede pedir opciones de login por passkey', async () => {
    await expect(build('Vendedor').opcionesLogin('a@x.com')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un Contador sin passkeys registradas recibe error claro (no opciones vacías)', async () => {
    await expect(build('Contador').opcionesLogin('a@x.com')).rejects.toThrow(/no tiene passkeys/i);
  });
});
