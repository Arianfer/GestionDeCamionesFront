import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Inicio } from './features/inicio/inicio';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard], // <-- Protege el Layout y TODAS sus rutas hijas de un solo tirón
    children: [
      { path: 'inicio', component: Inicio },
      {
        path: 'rutas',
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/rutas/rutas.routes').then(m => m.RUTAS_ROUTES),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' }, // Redirige al login si ingresan una URL cualquiera sin sesión
];