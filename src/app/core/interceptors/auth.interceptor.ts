import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const esLogin = req.url.includes('/auth/login');
  const esBackendPropio = req.url.startsWith(environment.apiUrl);

  let peticion = req;
  if (token && esBackendPropio && !esLogin) {
    peticion = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && esBackendPropio && !esLogin) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};