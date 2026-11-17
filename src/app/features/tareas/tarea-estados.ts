import { EstadoTarea } from '../../shared/models/tarea.model';

export interface EstadoTareaInfo {
  valor: EstadoTarea;
  etiqueta: string;
  accion: string;
  siguientes: EstadoTarea[];
}

export const ESTADOS_TAREA: EstadoTareaInfo[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente', accion: 'Reabrir', siguientes: ['EN_CURSO', 'CANCELADO'] },
  { valor: 'EN_CURSO', etiqueta: 'En curso', accion: 'Iniciar', siguientes: ['COMPLETADO', 'CANCELADO'] },
  { valor: 'COMPLETADO', etiqueta: 'Completada', accion: 'Completar', siguientes: [] },
  { valor: 'CANCELADO', etiqueta: 'Cancelada', accion: 'Cancelar', siguientes: [] },
];

export function etiquetaEstado(estado: EstadoTarea): string {
  return ESTADOS_TAREA.find((e) => e.valor === estado)?.etiqueta ?? estado;
}

export function accionEstado(estado: EstadoTarea): string {
  return ESTADOS_TAREA.find((e) => e.valor === estado)?.accion ?? estado;
}

// Funcion para los estados a los que se puede pasar desde 'estado' (vacío si ya está cerrada). 
export function siguientesDe(estado: EstadoTarea): EstadoTarea[] {
  return ESTADOS_TAREA.find((e) => e.valor === estado)?.siguientes ?? [];
}
