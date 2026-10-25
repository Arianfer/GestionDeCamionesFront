// src/app/features/rutas/rutas.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ruta, RutaChofer, RutaRequest } from '../../models/ruta.model';

@Injectable({ providedIn: 'root' })
export class RutasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/rutas`;

  getAll(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(this.url);
  }

  getById(id: number): Observable<Ruta> {
    return this.http.get<Ruta>(`${this.url}/${id}`);
  }

  getByNombre(nombre: string): Observable<Ruta> {
    return this.http.get<Ruta>(`${this.url}/nombre/${encodeURIComponent(nombre)}`);
  }

  crear(body: RutaRequest): Observable<Ruta> {
    return this.http.post<Ruta>(this.url, body);
  }

  actualizar(id: number, body: RutaRequest): Observable<Ruta> {
    return this.http.put<Ruta>(`${this.url}/${id}`, body);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Para el chofer: su ruta activa, con servicios ordenados por "orden".
   *  El endpoint vive en TareaController, pero devuelve una ruta. */
  getMiRuta(choferId: number): Observable<RutaChofer> {
    return this.http.get<RutaChofer>(
      `${environment.apiUrl}/tareas/mi-ruta/${choferId}`,
    );
  }
}