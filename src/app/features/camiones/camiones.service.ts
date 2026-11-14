import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Camion } from '../../shared/models/camion.model';

@Injectable({ 
    providedIn: 'root' 
})
export class CamionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/camiones`;

  obtenerTodos(): Observable<Camion[]> {
    return this.http.get<Camion[]>(this.url);
  }
}
