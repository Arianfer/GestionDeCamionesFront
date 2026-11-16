import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Solo adjuntamos el JWT si la petición va a nuestro backend (evita bloqueos CORS en OSRM y Georef)
  const esBackendPropio = req.url.startsWith('http://localhost:8080');

  let peticion = req;
  if (token && esBackendPropio) {
    peticion = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // SCRUM-46: Si el token expira o es inválido (401), ejecuta tu logout() que limpia todo y redirige
      if (error.status === 401 && esBackendPropio) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};