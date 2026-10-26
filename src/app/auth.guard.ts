import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Verificamos con el nombre exacto de la clave del localStorage[cite: 1]
  if (localStorage.getItem('token_jwt')) {
    return true;
  }

  return router.createUrlTree(['/login']);
};