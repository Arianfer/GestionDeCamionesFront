import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.sesionActiva()) {
    const rol = authService.getRol();
    return router.createUrlTree([rol === 'EMPLEADO' ? '/chofer' : '/inicio']);
  }

  authService.limpiarSesion();
  return true;
};