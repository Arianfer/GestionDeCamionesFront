import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const CAMIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./camion-list/camion-list').then((m) => m.CamionList),
  },
  {
    path: 'nuevo',
    redirectTo: () =>
      inject(Router).createUrlTree(['/camiones'], { queryParams: { nuevo: 1 } }),
  },
  {
    path: ':id/editar',
    redirectTo: (route) =>
      inject(Router).createUrlTree(['/camiones'], {
        queryParams: { editar: route.params['id'] },
      }),
  },
];
