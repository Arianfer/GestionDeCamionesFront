export type EstadoTarea = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';

export interface Tarea {
  id: number;
  descripcion: string | null;
  fechaEjecucion: string; 
  estado: EstadoTarea;
  idCamion: number;
  idRuta: number;
  idUsuario: number; 
}

export interface TareaRequest {
  descripcion: string;
  fechaEjecucion: string;
  estado: EstadoTarea;
  idCamion: number;
  idRuta: number;
  idUsuario: number;
}