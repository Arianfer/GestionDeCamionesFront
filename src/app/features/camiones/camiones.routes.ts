import { Routes } from '@angular/router';

export const CAMIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./camion-list/camion-list').then((m) => m.CamionList),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./camion-form/camion-form').then((m) => m.CamionForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./camion-form/camion-form').then((m) => m.CamionForm),
  },
];
