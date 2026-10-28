import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = route.data['roles'] as string[] | undefined;
  const rol = authService.getRol();

  if (!rolesPermitidos || (rol && rolesPermitidos.includes(rol))) {
    return true;
  }

  return router.createUrlTree(['/inicio']);
};