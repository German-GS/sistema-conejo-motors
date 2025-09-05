// backend/src/users/dto/create-user.dto.ts
export class CreateUserDto {
  nombre_completo: string;
  email: string;
  contrasena: string;
  salario_base?: number;
  rol_id?: number;
}
