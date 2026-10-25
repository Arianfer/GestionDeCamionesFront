import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Layout } from './components/layout/layout';
import { Inicio } from './components/inicio/inicio';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: Layout,
    children: [
      { path: 'inicio', component: Inicio },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];