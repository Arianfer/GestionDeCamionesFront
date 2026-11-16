import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce un error HTTP a un mensaje para el usuario.
 * `accion` completa la frase: "No se pudo <accion>".
 */
export function mensajeError(err: HttpErrorResponse, accion: string): string {
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Revisá que el backend esté levantado.';
  }
  // Errores del cliente (4xx) con mensaje propio del back: { status, error: "mensaje" }
  if (err.status >= 400 && err.status < 500 && typeof err.error?.error === 'string') {
    return err.error.error;
  }
  if (err.status === 403) {
    return `No tenés permiso para ${accion}.`;
  }
  if (err.status === 404) {
    return 'El servicio ya no existe. Puede que otro usuario lo haya eliminado.';
  }
  if (err.status >= 500) {
    return `Ocurrió un error en el servidor al ${accion}. Probá de nuevo y, si sigue pasando, avisá al equipo.`;
  }
  return `No se pudo ${accion}.`;
}