import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const RUTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ruta-list/ruta-list').then((m) => m.RutaList),
  },
  {
    path: 'nuevo',
    redirectTo: () =>
      inject(Router).createUrlTree(['/rutas'], { queryParams: { nueva: 1 } }),
  },
  {
    path: ':id/editar',
    redirectTo: (route) =>
      inject(Router).createUrlTree(['/rutas'], {
        queryParams: { editar: route.params['id'] },
      }),
  },
  {
    path: ':id/mapa',
    loadComponent: () =>
      import('./ruta-mapa/ruta-mapa').then((m) => m.RutaMapa),
  },
];
