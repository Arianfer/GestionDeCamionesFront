import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const SERVICIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./servicio-list/servicio-list').then((m) => m.ServicioList),
  },
  {
    path: 'nuevo',
    redirectTo: () =>
      inject(Router).createUrlTree(['/servicios'], { queryParams: { nuevo: 1 } }),
  },
  {
    path: ':id/editar',
    redirectTo: (route) =>
      inject(Router).createUrlTree(['/servicios'], {
        queryParams: { editar: route.params['id'] },
      }),
  },
];
