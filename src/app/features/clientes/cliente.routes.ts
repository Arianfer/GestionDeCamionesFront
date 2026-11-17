import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cliente-list/cliente-list').then((m) => m.ClienteList),
  },
  {
    path: 'nuevo',
    redirectTo: () =>
      inject(Router).createUrlTree(['/clientes'], { queryParams: { nuevo: 1 } }),
  },
  {
    path: ':id/editar',
    redirectTo: (route) =>
      inject(Router).createUrlTree(['/clientes'], {
        queryParams: { editar: route.params['id'] },
      }),
  },
];
