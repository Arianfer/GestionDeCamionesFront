import { Servicio } from './servicio.model';

/** Lo que devuelve el backend (GET, y respuesta de POST/PUT) */
export interface Ruta {
  idRuta: number;
  nombre: string;
  descripcion: string;
  servicios: Servicio[] | null;
  fecha: string | null;          // 'YYYY-MM-DD'
  idChofer: number;
  nombreChofer: string;
}

/** Lo que se envía al crear (POST) o editar (PUT) */
export interface RutaRequest {
  nombre: string;
  descripcion: string;
  fecha: string;          // 'YYYY-MM-DD'
  idChofer: number;
}

/** Respuesta de GET /api/tareas/mi-ruta/{choferId}: fecha y chofer vienen en null */
export interface RutaChofer extends Omit<Ruta, 'fecha' | 'idChofer' | 'nombreChofer'> {
  fecha: string | null;
  idChofer: number | null;
  nombreChofer: string | null;
}