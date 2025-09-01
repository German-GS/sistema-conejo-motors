// backend/src/users/dto/create-user.dto.ts
export class CreateUserDto {
  nombre_completo: string;
  email: string;
  contrasena: string; // Recibimos 'contrasena', la convertiremos a 'password_hash'
}
