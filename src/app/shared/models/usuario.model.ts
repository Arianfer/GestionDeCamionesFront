export type Rol = 'ADMIN' | 'OFICINA' | 'EMPLEADO';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  rol: Rol;
  activo: boolean;
}