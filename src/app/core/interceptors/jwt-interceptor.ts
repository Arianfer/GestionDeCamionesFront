import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const esLogin = req.url.includes('/auth/login');
  const esNuestraApi = req.url.startsWith(environment.apiUrl);

  if (!token || esLogin || !esNuestraApi) {
    return next(req);
  }

  const reqConToken = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(reqConToken);
};