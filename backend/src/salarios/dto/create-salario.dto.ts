// backend/src/salarios/dto/create-salario.dto.ts
export class CreateSalarioDto {
  salario_base: number;
  fecha_efectiva: Date;
  usuarioId: number;
}
