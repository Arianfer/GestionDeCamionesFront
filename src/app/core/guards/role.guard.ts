import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn & CanMatchFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.sesionActiva()) {
    authService.limpiarSesion();
    return router.createUrlTree(['/login']);
  }

  const rolesPermitidos = route.data?.['roles'] as string[] | undefined;
  const rol = authService.getRol();

  if (rolesPermitidos?.length && rol && rolesPermitidos.includes(rol)) {
    return true;
  }

  return router.createUrlTree(['/inicio']);
};
