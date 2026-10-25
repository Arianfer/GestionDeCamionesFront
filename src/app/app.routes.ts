import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Inicio } from './features/inicio/inicio';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'inicio', component: Inicio },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];