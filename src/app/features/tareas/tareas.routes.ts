import { Routes } from '@angular/router';

export const TAREAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./tarea-list/tarea-list').then((m) => m.TareaList),
  },
];
