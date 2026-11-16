import { Routes } from '@angular/router';
import { RutaList } from './ruta-list/ruta-list';
import { RutaForm } from './ruta-form/ruta-form';
import { RutaMapa } from './ruta-mapa/ruta-mapa';

export const RUTAS_ROUTES: Routes = [
  { path: '', component: RutaList },
  { path: 'nuevo', component: RutaForm },
  { path: ':id/editar', component: RutaForm },
  { path: ':id/mapa', component: RutaMapa },
];