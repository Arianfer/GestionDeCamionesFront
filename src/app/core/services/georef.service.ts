import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

export interface DireccionNormalizada {
  direccionFormateada: string;
  direccionCorta: string;
  latitud: number;
  longitud: number;
}

@Injectable({ providedIn: 'root' })
export class GeorefService {
  private http = inject(HttpClient);
  private readonly georefUrl = 'https://apis.datos.gob.ar/georef/api/direcciones';
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  // General Pueyrredón (06357), Mar Chiquita / Santa Clara (06518), Balcarce (06063), Gral. Alvarado / Miramar (06351)
  private readonly DEPTOS_ZONA = '06357,06518,06063,06351';

  // Bounding box regional: Oeste Balcarce (-58.35), Norte Santa Clara (-37.75), Este Costa (-57.45), Sur Miramar (-38.35)
  private readonly VIEWBOX_ZONA = '-58.35,-37.75,-57.45,-38.35';

  buscarEnZona(textoDireccion: string): Observable<DireccionNormalizada[]> {
    const query = textoDireccion.trim();
    if (query.length < 3) return of([]);

    const params = new HttpParams()
      .set('direccion', query)
      .set('departamento', this.DEPTOS_ZONA)
      .set('max', '6')
      .set('campos', 'calle.nombre,altura.valor,departamento.nombre,localidad_censal.nombre,ubicacion.lat,ubicacion.lon');

    return this.http.get<any>(this.georefUrl, { params }).pipe(
      map((res) =>
        (res.direcciones ?? [])
          .filter((d: any) => d.ubicacion?.lat && d.ubicacion?.lon)
          .map((d: any) => {
            const calle = this.capitalizar(d.calle?.nombre ?? '');
            const altura = d.altura?.valor ? ` ${d.altura.valor}` : '';
            const localidad = d.localidad_censal?.nombre
              ? this.capitalizar(d.localidad_censal.nombre)
              : d.departamento?.nombre === 'General Pueyrredón'
                ? 'Mar del Plata'
                : this.capitalizar(d.departamento?.nombre ?? 'Mar del Plata');

            const direccionCorta = `${calle}${altura}`.trim();
            return {
              direccionCorta,
              direccionFormateada: `${direccionCorta}, ${localidad}, Buenos Aires, Argentina`,
              latitud: Number(d.ubicacion.lat.toFixed(6)),
              longitud: Number(d.ubicacion.lon.toFixed(6)),
            };
          })
      ),
      // Si Georef no encuentra (ej. nombre comercial, ruta o intersección), usamos Nominatim acotado a la región
      switchMap((resultados) => (resultados.length > 0 ? of(resultados) : this.buscarFallbackNominatim(query))),
      catchError(() => this.buscarFallbackNominatim(query))
    );
  }

  private buscarFallbackNominatim(query: string): Observable<DireccionNormalizada[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('addressdetails', '1')
      .set('countrycodes', 'ar')
      .set('viewbox', this.VIEWBOX_ZONA)
      .set('bounded', '1')
      .set('limit', '5');

    return this.http.get<any[]>(this.nominatimUrl, { params }).pipe(
      map((items) =>
        (items ?? []).map((item) => {
          const addr = item.address ?? {};
          const calle = addr.road || addr.pedestrian || item.name || query;
          const altura = addr.house_number ? ` ${addr.house_number}` : '';
          const ciudad = addr.city || addr.town || addr.village || 'Mar del Plata';
          const direccionCorta = `${calle}${altura}`.trim();

          return {
            direccionCorta,
            direccionFormateada: `${direccionCorta}, ${ciudad}, Buenos Aires, Argentina`,
            latitud: Number(parseFloat(item.lat).toFixed(6)),
            longitud: Number(parseFloat(item.lon).toFixed(6)),
          };
        })
      ),
      catchError(() => of([]))
    );
  }

  private capitalizar(texto: string): string {
    return texto
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
}