import { HttpErrorResponse } from '@angular/common/http';

export function erroresDeCampos(err: HttpErrorResponse): Record<string, string> | null {
  const cuerpo = err.error;
  const esValidacion =
    err.status === 400 && cuerpo && typeof cuerpo === 'object' && typeof cuerpo.error !== 'string';
  return esValidacion ? (cuerpo as Record<string, string>) : null;
}

/**
 * Traduce un error HTTP a un mensaje para el usuario.
 * `accion` completa la frase: "No se pudo <accion>".
 *
 * Los errores de negocio del back (ej. camión no disponible) llegan como
 * 400 con { timestamp, error: "mensaje", status: 400 }: se muestran tal cual.
 */
export function mensajeErrorTarea(err: HttpErrorResponse, accion: string): string {
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Revisá que el backend esté levantado.';
  }
  if (err.status === 400 && typeof err.error?.error === 'string') {
    return err.error.error;
  }
  if (err.status === 403) {
    return `No tenés permiso para ${accion}.`;
  }
  if (err.status >= 500) {
    return `Ocurrió un error en el servidor al ${accion}. Actualizá la pantalla y probá de nuevo; si sigue pasando, avisá al equipo.`;
  }
  return `No se pudo ${accion}.`;
}
