import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Layout } from './components/layout/layout';
import { Inicio } from './components/inicio/inicio';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Layout,
    children: [
      { path: 'inicio', component: Inicio },
      {
        path: 'rutas',
        canActivate: [],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/rutas/rutas.routes').then(m => m.RUTAS_ROUTES),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];