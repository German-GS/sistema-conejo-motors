import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    UsersModule, // Lo importamos para poder usar UsersService
    PassportModule,
    JwtModule.register({
      //global: true,
      secret: 'ESTO_ES_UN_SECRETO_TEMPORAL', // IMPORTANTE: En producción esto debe ser una variable de entorno
      signOptions: { expiresIn: '1h' }, // El token expira en 1 hora
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
