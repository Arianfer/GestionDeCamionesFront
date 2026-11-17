import { HttpErrorResponse } from '@angular/common/http';

/**
 * Si el back rechazó el formulario por @Valid, devuelve { campo: mensaje }.
 * Para cualquier otro error devuelve null.
 *
 * El back responde 400 con dos formatos distintos:
 *  - Validación (@Valid):  { "nombre": "El nombre es obligatorio", ... }
 *  - Regla de negocio:     { "timestamp": ..., "status": 400, "error": "mensaje" }
 * Se distinguen porque el de negocio trae "error" como texto.
 */
export function erroresDeValidacion(err: HttpErrorResponse): Record<string, string> | null {
  const body = err.error;
  const esValidacion =
    err.status === 400 &&
    body !== null &&
    typeof body === 'object' &&
    typeof body.error !== 'string';
  return esValidacion ? (body as Record<string, string>) : null;
}

/**
 * Traduce un error HTTP a un mensaje para el usuario.
 * `accion` completa la frase, por ejemplo "guardar el cliente".
 */
export function mensajeError(err: HttpErrorResponse, accion: string): string {
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Revisá que el backend esté levantado.';
  }
  // 4xx con mensaje propio del back (404, 409, 401, 400 de negocio): { status, error: "mensaje" }
  if (err.status >= 400 && err.status < 500 && typeof err.error?.error === 'string') {
    return err.error.error;
  }
  if (err.status === 403) {
    return `No tenés permiso para ${accion}.`;
  }
  if (err.status === 404) {
    return 'Lo que buscás ya no existe. Puede que otro usuario lo haya eliminado.';
  }
  if (err.status >= 500) {
    return `Ocurrió un error en el servidor al ${accion}. Probá de nuevo y, si sigue pasando, avisá al equipo.`;
  }
  return `No se pudo ${accion}.`;
}