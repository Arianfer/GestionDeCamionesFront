export type EstadoTarea = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';

export interface Tarea {
  id: number;
  descripcion: string | null;
  fechaEjecucion: string; // 'YYYY-MM-DDTHH:mm:ss'
  estado: EstadoTarea;
  idCamion: number;
  idRuta: number;
  idUsuario: number; // el chofer
}

export interface TareaRequest {
  descripcion: string;
  fechaEjecucion: string; // 'YYYY-MM-DDTHH:mm:ss'
  estado: EstadoTarea;
  idCamion: number;
  idRuta: number;
  idUsuario: number;
}