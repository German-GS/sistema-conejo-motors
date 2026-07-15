import { AuthService } from './auth.service';

describe('AuthService.recuperarAdmin (break-glass)', () => {
  const usersService = { resetAdminPassword: jest.fn().mockResolvedValue({ ok: true, email: 'a@a.com' }) };
  const svc = new AuthService(usersService as any, {} as any);
  const OLD = process.env.ADMIN_RESET_SECRET;
  afterEach(() => { process.env.ADMIN_RESET_SECRET = OLD; });

  it('falla si la recuperación no está configurada', async () => {
    delete process.env.ADMIN_RESET_SECRET;
    await expect(svc.recuperarAdmin('a@a.com', 'nuevaClave1', 'x')).rejects.toThrow(/no está configurada/i);
  });

  it('falla con secreto inválido', async () => {
    process.env.ADMIN_RESET_SECRET = 'correcto';
    await expect(svc.recuperarAdmin('a@a.com', 'nuevaClave1', 'malo')).rejects.toThrow(/inválido/i);
    expect(usersService.resetAdminPassword).not.toHaveBeenCalled();
  });

  it('falla si la nueva contraseña es muy corta', async () => {
    process.env.ADMIN_RESET_SECRET = 'correcto';
    await expect(svc.recuperarAdmin('a@a.com', '123', 'correcto')).rejects.toThrow(/8 caracteres/i);
  });

  it('con secreto correcto, resetea la contraseña del admin', async () => {
    process.env.ADMIN_RESET_SECRET = 'correcto';
    const r = await svc.recuperarAdmin('a@a.com', 'nuevaClave1', 'correcto');
    expect(usersService.resetAdminPassword).toHaveBeenCalledWith('a@a.com', 'nuevaClave1');
    expect(r).toEqual({ ok: true, email: 'a@a.com' });
  });
});
