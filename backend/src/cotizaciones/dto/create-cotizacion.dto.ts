import { CreateClienteDto } from '../../clientes/dto/create-cliente.dto';

export class CreateCotizacionDto {
  cliente: CreateClienteDto; // Podemos recibir los datos del cliente aquí mismo
  vehiculoId: number;
  precio_final: number;
  fecha_expiracion: Date;
}
