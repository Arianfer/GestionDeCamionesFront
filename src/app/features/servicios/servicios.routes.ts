import { Routes } from '@angular/router';

export const SERVICIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./servicio-list/servicio-list').then((m) => m.ServicioList),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./servicio-form/servicio-form').then((m) => m.ServicioForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./servicio-form/servicio-form').then((m) => m.ServicioForm),
  },
];