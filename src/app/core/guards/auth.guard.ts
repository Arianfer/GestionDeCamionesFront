import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn & CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.sesionActiva()) {
    return true;
  }

  authService.limpiarSesion();
  return router.createUrlTree(['/login']);
};
