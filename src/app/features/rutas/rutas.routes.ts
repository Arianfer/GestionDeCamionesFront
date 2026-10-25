import { Routes } from '@angular/router';

export const RUTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ruta-list/ruta-list').then(m => m.RutaList),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./ruta-form/ruta-form').then(m => m.RutaForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./ruta-form/ruta-form').then(m => m.RutaForm),
  },
];