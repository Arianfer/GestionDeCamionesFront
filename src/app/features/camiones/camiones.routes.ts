import { Routes } from '@angular/router';

export const CAMIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
        import('./camion-list/camion-list').then((m) => m.CamionList),
  }
];
