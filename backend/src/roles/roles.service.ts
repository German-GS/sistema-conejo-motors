// En: src/roles/roles.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common'; // <-- 1. IMPORTA OnModuleInit
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  // <-- 2. IMPLEMENTA LA INTERFAZ
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  // --- 👇 3. AÑADE ESTE MÉTODO COMPLETO 👇 ---
  async onModuleInit() {
    const roles = [
      {
        nombre: 'Administrador',
        descripcion: 'Acceso total al sistema y a la configuración.',
      },
      {
        nombre: 'Vendedor',
        descripcion: 'Acceso al inventario y registro de ventas.',
      },
      {
        nombre: 'Contador',
        descripcion: 'Acceso a los módulos de planilla y reportes financieros.',
      },
    ];

    for (const roleData of roles) {
      const roleExists = await this.rolesRepository.findOneBy({
        nombre: roleData.nombre,
      });
      if (!roleExists) {
        const newRole = this.rolesRepository.create(roleData);
        await this.rolesRepository.save(newRole);
        console.log(`Rol sembrado: ${newRole.nombre}`);
      }
    }
  }
  // ---------------------------------------------

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async create(nombre: string, descripcion: string): Promise<Role> {
    const newRole = this.rolesRepository.create({ nombre, descripcion });
    return this.rolesRepository.save(newRole);
  }
}
