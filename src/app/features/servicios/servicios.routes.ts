import { Routes } from '@angular/router';

export const SERVICIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./servicio-list/servicio-list').then((m) => m.ServicioList),
  },
];