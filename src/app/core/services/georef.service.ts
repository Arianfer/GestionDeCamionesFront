// src/app/core/services/georef.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface DireccionNormalizada {
  direccionFormateada: string;
  calle: string;
  altura: number;
  latitud: number;
  longitud: number;
}

@Injectable({ providedIn: 'root' })
export class GeorefService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://apis.datos.gob.ar/georef/api/direcciones';

  // Código INDEC de General Pueyrredon (Mar del Plata): 06357
  private readonly DEPTO_MDP = '06357';

  buscarEnMarDelPlata(textoDireccion: string): Observable<DireccionNormalizada[]> {
    const params = new HttpParams()
      .set('direccion', textoDireccion.trim())
      .set('departamento', this.DEPTO_MDP)
      .set('max', '6')
      .set('campos', 'calle.nombre,altura.valor,ubicacion.lat,ubicacion.lon,nomenclatura');

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map((res) =>
        (res.direcciones ?? [])
          .filter((d: any) => d.ubicacion?.lat && d.ubicacion?.lon)
          .map((d: any) => ({
            direccionFormateada: `${d.calle.nombre} ${d.altura.valor}, Mar del Plata`,
            calle: d.calle.nombre,
            altura: d.altura.valor,
            latitud: d.ubicacion.lat,
            longitud: d.ubicacion.lon,
          }))
      )
    );
  }
}