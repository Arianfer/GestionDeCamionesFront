// src/app/features/usuarios/usuarios.routes.ts
import { Routes } from '@angular/router';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./usuario-list/usuario-list').then(m => m.UsuarioList),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./usuario-form/usuario-form').then(m => m.UsuarioForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./usuario-form/usuario-form').then(m => m.UsuarioForm),
  },
];