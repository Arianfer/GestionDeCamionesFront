import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tarea } from '../../shared/models/tarea.model';

@Injectable({ providedIn: 'root' })
export class TareasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tareas`;

  obtenerTodas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.url);
  }
}
