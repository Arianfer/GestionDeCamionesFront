import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Servicio, ServicioRequest } from '../../shared/models/servicio.model';

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/servicios`;

  getAll(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(this.url);
  }

  getById(id: number): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.url}/${id}`);
  }

  crear(body: ServicioRequest): Observable<Servicio> {
    return this.http.post<Servicio>(this.url, body);
  }

  actualizar(id: number, body: ServicioRequest): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.url}/${id}`, body);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}