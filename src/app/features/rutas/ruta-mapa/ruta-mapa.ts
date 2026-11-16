import { Component, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { RutasService } from '../rutas.service';
import { Servicio } from '../../../shared/models/servicio.model';

@Component({
  selector: 'app-ruta-mapa',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ruta-mapa.html',
  styleUrl: './ruta-mapa.css'
})
export class RutaMapa implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private rutasService = inject(RutasService);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  /** Opcional: si se usa embebido dentro de ruta-form */
  @Input() paradasExternas: Servicio[] | null = null;

  private map: L.Map | null = null;
  private markersLayer = L.layerGroup();
  private rutaPolyline: L.Polyline | null = null;

  esVistaEmbebida = signal(false);
  nombreRuta = signal('Cargando ruta...');
  descripcionRuta = signal('');
  nombreChofer = signal('');
  paradas = signal<Servicio[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  distanciaKm = signal<number | null>(null);
  duracionMin = signal<number | null>(null);

  ngOnInit(): void {
    if (this.paradasExternas !== null) {
      this.esVistaEmbebida.set(true);
      this.nombreRuta.set('Vista previa del recorrido');
      this.paradas.set(this.paradasExternas);
      return;
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cargarRutaDesdeApi(Number(idParam));
    }
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
    if (this.paradas().length > 0) {
      this.renderizarRuta();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paradasExternas'] && this.paradasExternas !== null) {
      this.esVistaEmbebida.set(true);
      this.paradas.set(this.paradasExternas);
      if (this.map) {
        this.renderizarRuta();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private cargarRutaDesdeApi(id: number): void {
    this.cargando.set(true);
    this.rutasService.getById(id).subscribe({
      next: (ruta) => {
        this.nombreRuta.set(ruta.nombre);
        this.descripcionRuta.set(ruta.descripcion ?? '');
        this.nombreChofer.set(ruta.nombreChofer ?? '');
        const ordenados = [...(ruta.servicios ?? [])].sort((a, b) => a.orden - b.orden);
        this.paradas.set(ordenados);
        this.cargando.set(false);
        this.renderizarRuta();
      },
      error: () => {
        this.error.set('No se pudo cargar la información de la ruta.');
        this.cargando.set(false);
      }
    });
  }

  private inicializarMapa(): void {
    // Centro por defecto: Mar del Plata
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [-38.0055, -57.5426],
      zoom: 13
    });

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(this.map);

    this.markersLayer.addTo(this.map);
  }

  renderizarRuta(): void {
    if (!this.map) return;

    this.markersLayer.clearLayers();
    if (this.rutaPolyline) {
      this.rutaPolyline.remove();
      this.rutaPolyline = null;
    }
    this.distanciaKm.set(null);
    this.duracionMin.set(null);

    const validas = this.paradas().filter(p => p.latitud && p.longitud);
    if (validas.length === 0) return;

    const bounds = L.latLngBounds([]);

    validas.forEach((parada, idx) => {
      const icon = L.divIcon({
        className: 'admin-parada-marker',
        html: `<div class="admin-pin">${idx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([parada.latitud, parada.longitud], { icon })
        .bindPopup(`
          <strong>#${idx + 1} - ${parada.nombre}</strong><br>
          <span>${parada.direccion}</span>
          ${parada.tipoResiduo ? `<br><small>Residuo: ${parada.tipoResiduo}</small>` : ''}
        `)
        .addTo(this.markersLayer);

      bounds.extend([parada.latitud, parada.longitud]);
    });

    this.map.fitBounds(bounds, { padding: [45, 45] });

    if (validas.length >= 2) {
      this.trazarRecorridoOSRM(validas);
    }
  }

  private trazarRecorridoOSRM(paradas: Servicio[]): void {
    const coordsQuery = paradas
      .map(p => `${p.longitud},${p.latitud}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (!this.map || !res?.routes?.length) return;

        const ruta = res.routes[0];
        this.distanciaKm.set(Math.round((ruta.distance / 1000) * 10) / 10);
        this.duracionMin.set(Math.round(ruta.duration / 60));

        const latLngs: [number, number][] = ruta.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        this.rutaPolyline = L.polyline(latLngs, {
          color: '#2e7d32',
          weight: 5,
          opacity: 0.85
        }).addTo(this.map);
      },
      error: () => {
        if (!this.map) return;
        const fallback = paradas.map(p => [p.latitud, p.longitud] as [number, number]);
        this.rutaPolyline = L.polyline(fallback, {
          color: '#2e7d32',
          weight: 4,
          dashArray: '6, 6'
        }).addTo(this.map);
      }
    });
  }

  enfocarParada(parada: Servicio): void {
    if (!this.map || !parada.latitud || !parada.longitud) return;
    this.map.setView([parada.latitud, parada.longitud], 16);
  }
}