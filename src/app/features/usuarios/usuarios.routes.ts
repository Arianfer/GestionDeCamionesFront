import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./usuario-list/usuario-list').then((m) => m.UsuarioList),
  },
  {
    path: 'nuevo',
    redirectTo: () =>
      inject(Router).createUrlTree(['/usuarios'], { queryParams: { nuevo: 1 } }),
  },
  {
    path: ':id/editar',
    redirectTo: (route) =>
      inject(Router).createUrlTree(['/usuarios'], {
        queryParams: { editar: route.params['id'] },
      }),
  },
];
