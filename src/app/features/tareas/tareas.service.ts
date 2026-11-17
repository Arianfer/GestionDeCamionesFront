import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoTarea, Tarea, TareaRequest } from '../../shared/models/tarea.model';

@Injectable({ providedIn: 'root' })
export class TareasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tareas`;

  obtenerTodas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.url);
  }

  crearTarea(tarea: TareaRequest): Observable<Tarea> {
    return this.http.post<Tarea>(this.url, tarea);
  }

  actualizarEstado(id: number, nuevoEstado: EstadoTarea): Observable<Tarea> {
    const params = new HttpParams().set('nuevoEstado', nuevoEstado);
    return this.http.patch<Tarea>(`${this.url}/${id}/estado`, null, { params });
  }
}
