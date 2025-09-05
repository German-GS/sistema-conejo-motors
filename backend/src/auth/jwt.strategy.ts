import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'ESTO_ES_UN_SECRETO_TEMPORAL', // Debe ser el mismo secreto que en auth.module.ts
    });
  }

  async validate(payload: any) {
    // El payload es el objeto que pusimos en el token: { email: ..., sub: ... }
    // Lo que retornemos aquí se inyectará en el objeto 'request' de nuestras rutas protegidas
    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}
