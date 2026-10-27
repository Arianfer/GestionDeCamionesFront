import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Inicio } from './features/inicio/inicio';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
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
  { 
    path: 'clientes',
    loadChildren: () => 
      import('./features/clientes/cliente.routes').then(m => m.CLIENTES_ROUTES) 
  },
  { 
    path: '**', 
    redirectTo: 'inicio' 
  }
];