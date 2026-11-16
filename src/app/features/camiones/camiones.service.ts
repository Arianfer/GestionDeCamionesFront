import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Camion,
  CamionRequest,
  EstadoCamion,
  TipoCamion,
} from '../../shared/models/camion.model';

interface CamionApi {
  id: number;
  patente: string;
  tipo: TipoCamion;
  estadoCamion?: EstadoCamion;
  estado?: EstadoCamion;
  capacidadCarga: number;
  consumoDieselPorKm: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class CamionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/camiones`;

  obtenerTodos(): Observable<Camion[]> {
    return this.http
      .get<CamionApi[]>(this.url)
      .pipe(map((camiones) => camiones.map((camion) => this.normalizar(camion))));
  }

  obtenerCamionPorId(id: number): Observable<Camion> {
    return this.http
      .get<CamionApi>(`${this.url}/${id}`)
      .pipe(map((camion) => this.normalizar(camion)));
  }

  crearCamion(camion: CamionRequest): Observable<Camion> {
    return this.http
      .post<CamionApi>(this.url, camion)
      .pipe(map((camionCreado) => this.normalizar(camionCreado)));
  }

  actualizarCamion(id: number, camion: CamionRequest): Observable<Camion> {
    return this.http
      .put<CamionApi>(`${this.url}/${id}`, camion)
      .pipe(map((camionActualizado) => this.normalizar(camionActualizado)));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  private normalizar(camion: CamionApi): Camion {
    return {
      id: camion.id,
      patente: camion.patente,
      tipo: camion.tipo,
      estadoCamion: camion.estadoCamion ?? camion.estado ?? 'DISPONIBLE',
      capacidadCarga: camion.capacidadCarga,
      consumoDieselPorKm: camion.consumoDieselPorKm ?? null,
    };
  }
}
