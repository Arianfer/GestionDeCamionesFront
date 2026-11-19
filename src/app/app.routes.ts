import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Inicio } from './features/inicio/inicio';
import { RutaChoferComponent } from './features/empleado/ruta-chofer';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: 'chofer',
    component: RutaChoferComponent,
    canActivate: [authGuard, roleGuard],
    canMatch: [authGuard, roleGuard],
    data: { roles: ['EMPLEADO'] },
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canMatch: [authGuard],
    children: [
      { path: 'inicio', component: Inicio },
      {
        path: 'rutas',
        canActivate: [roleGuard],
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/rutas/rutas.routes').then((m) => m.RUTAS_ROUTES),
      },
      {
        path: 'clientes',
        canActivate: [roleGuard],
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/clientes/cliente.routes').then((m) => m.CLIENTES_ROUTES),
      },
      {
        path: 'servicios',
        canActivate: [roleGuard],
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/servicios/servicios.routes').then(
            (m) => m.SERVICIOS_ROUTES,
          ),
      },
      {
        path: 'camiones',
        canActivate: [roleGuard],
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/camiones/camiones.routes').then(
            (m) => m.CAMIONES_ROUTES,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/usuarios/usuarios.routes').then(
            (m) => m.USUARIOS_ROUTES,
          ),
      },
      {
        path: 'tareas',
        canActivate: [roleGuard],
        canMatch: [roleGuard],
        data: { roles: ['ADMIN', 'OFICINA'] },
        loadChildren: () =>
          import('./features/tareas/tareas.routes').then(m => m.TAREAS_ROUTES),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];
