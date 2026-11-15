import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { ChoferService, RutaChofer, ServicioParada, TareaActiva } from '../../core/services/chofer.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-ruta-chofer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ruta-chofer.html',
  styleUrl: './ruta-chofer.css'
})
export class RutaChoferComponent implements OnInit, AfterViewInit, OnDestroy {
  private choferService = inject(ChoferService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private camionMarker: L.Marker | null = null;
  private paradasLayer = L.layerGroup();
  private rutaPolyline: L.Polyline | null = null;

  ruta = signal<RutaChofer | null>(null);
  tareaActiva = signal<TareaActiva | null>(null);
  paradas = signal<ServicioParada[]>([]);
  indiceActual = signal<number>(0);
  ubicacionCamion = signal<{ lat: number; lng: number }>({ lat: -38.0055, lng: -57.5426 }); // Mar del Plata por defecto
  cargando = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  modalActivo = signal<'FALLA' | 'INCIDENCIA' | null>(null);
  motivoSeleccionado = signal<string>('Candado Propio');
  textoObservacion = signal<string>('');

  motivosFalla = [
    'Candado Propio',
    'Lleno de Escombros',
    'Hongos rotos',
    'Vehículo obstruyendo',
    'Otros'
  ];

  paradaActual = computed(() => {
    const lista = this.paradas();
    const idx = this.indiceActual();
    return lista.length > 0 && idx < lista.length ? lista[idx] : null;
  });

  rutaFinalizada = computed(() => {
    const lista = this.paradas();
    return lista.length > 0 && this.indiceActual() >= lista.length;
  });

  private watchId: number | null = null;

  ngOnInit(): void {
    this.iniciarGeolocalizacion();
    this.cargarDatosChofer();
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private inicializarMapa(): void {
    const inicio = this.ubicacionCamion();

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [inicio.lat, inicio.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Tiles oficiales de OpenStreetMap (100% gratis, sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.paradasLayer.addTo(this.map);

    // Marcador del camión
    const camionIcon = L.divIcon({
      className: 'custom-camion-marker',
      html: `<div class="camion-dot">🚛</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.camionMarker = L.marker([inicio.lat, inicio.lng], {
      icon: camionIcon,
      zIndexOffset: 1000
    }).addTo(this.map);

    if (this.paradas().length > 0) {
      this.actualizarMapaCompleto();
    }
  }

  iniciarGeolocalizacion(): void {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const nuevaPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          this.ubicacionCamion.set(nuevaPos);

          if (this.camionMarker) {
            this.camionMarker.setLatLng([nuevaPos.lat, nuevaPos.lng]);
          }
          this.trazarRutaEnMapa();
        },
        (err) => console.warn('GPS no disponible, usando ubicación por defecto:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  }

  cargarDatosChofer(): void {
    const choferId = Number(localStorage.getItem('user_id'));
    if (!choferId) {
      this.errorMsg.set('No se encontró el ID del chofer en sesión.');
      this.cargando.set(false);
      return;
    }

    this.choferService.obtenerMisTareasActivas(choferId).subscribe({
      next: (tareas) => {
        if (tareas.length > 0) {
          const tarea = tareas[0];
          this.tareaActiva.set(tarea);
          if (tarea.estado === 'PENDIENTE') {
            this.choferService.actualizarEstadoTarea(tarea.id, 'EN_CURSO').subscribe();
          }
        }
      }
    });

    this.choferService.obtenerMiRuta(choferId).subscribe({
      next: (rutaData) => {
        this.ruta.set(rutaData);
        const paradasInit = rutaData.servicios.map(s => ({
          ...s,
          // Si la parada quedó con 0,0 en la BD, evitamos que caiga en el océano
          latitud: s.latitud && s.latitud !== 0 ? s.latitud : -38.0055,
          longitud: s.longitud && s.longitud !== 0 ? s.longitud : -57.5426,
          estadoParada: 'PENDIENTE' as const
        }));
        this.paradas.set(paradasInit);
        this.cargando.set(false);
        this.actualizarMapaCompleto();
      },
      error: (err) => {
        this.errorMsg.set(err.error?.error || 'No tenés recorridos activos asignados por el momento.');
        this.cargando.set(false);
      }
    });
  }

  private actualizarMapaCompleto(): void {
    if (!this.map) return;

    this.dibujarMarcadoresParadas();
    this.trazarRutaEnMapa();

    const actual = this.paradaActual();
    if (actual) {
      this.map.setView([actual.latitud, actual.longitud], 15);
    }
  }

  private dibujarMarcadoresParadas(): void {
    this.paradasLayer.clearLayers();
    const lista = this.paradas();
    const idxActual = this.indiceActual();

    lista.forEach((parada, index) => {
      const esActual = index === idxActual;
      const yaPaso = index < idxActual;

      let color = '#6c757d';
      if (esActual) color = '#1a73e8';
      if (yaPaso) {
        color = parada.estadoParada === 'FALLA' ? '#dc3545' :
                parada.estadoParada === 'INCIDENCIA' ? '#fd7e14' : '#28a745';
      }

      const size = esActual ? 34 : 26;
      const icon = L.divIcon({
        className: 'custom-parada-marker',
        html: `
          <div class="parada-circle ${esActual ? 'actual' : ''}"
               style="background:${color}; width:${size}px; height:${size}px;">
            ${index + 1}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      L.marker([parada.latitud, parada.longitud], { icon })
        .bindPopup(`<strong>#${index + 1} ${parada.nombre}</strong><br>${parada.direccion}`)
        .addTo(this.paradasLayer);
    });
  }

  trazarRutaEnMapa(): void {
    if (!this.map) return;

    const pendientes = this.paradas().slice(this.indiceActual());
    if (pendientes.length === 0) {
      if (this.rutaPolyline) {
        this.rutaPolyline.remove();
        this.rutaPolyline = null;
      }
      return;
    }

    const origen = this.ubicacionCamion();
    // OSRM espera formato: lng,lat;lng,lat...
    const puntos = [
      `${origen.lng},${origen.lat}`,
      ...pendientes.map(p => `${p.longitud},${p.latitud}`)
    ].join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${puntos}?overview=full&geometries=geojson`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (!this.map || !res?.routes?.length) return;

        // GeoJSON viene como [lng, lat], Leaflet necesita [lat, lng]
        const coords: [number, number][] = res.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        if (this.rutaPolyline) {
          this.rutaPolyline.setLatLngs(coords);
        } else {
          this.rutaPolyline = L.polyline(coords, {
            color: '#1a73e8',
            weight: 6,
            opacity: 0.9
          }).addTo(this.map);
        }
      },
      error: () => {
        // Fallback: línea recta entre puntos si OSRM no responde
        if (!this.map) return;
        const fallbackCoords: [number, number][] = [
          [origen.lat, origen.lng],
          ...pendientes.map(p => [p.latitud, p.longitud] as [number, number])
        ];
        if (this.rutaPolyline) {
          this.rutaPolyline.setLatLngs(fallbackCoords);
        } else {
          this.rutaPolyline = L.polyline(fallbackCoords, {
            color: '#1a73e8',
            weight: 5,
            dashArray: '8, 8'
          }).addTo(this.map);
        }
      }
    });
  }

  abrirNavegacionGps(): void {
    const actual = this.paradaActual();
    if (!actual) return;
    // Abre la app nativa de navegación (Google Maps / Waze en el celular sin gastar API key)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${actual.latitud},${actual.longitud}&travelmode=driving`;
    window.open(url, '_blank');
  }

  marcarCompletada(): void {
    this.avanzarParada('COMPLETADA');
  }

  abrirModalFalla(): void {
    this.motivoSeleccionado.set('Candado Propio');
    this.textoObservacion.set('');
    this.modalActivo.set('FALLA');
  }

  abrirModalIncidencia(): void {
    this.textoObservacion.set('');
    this.modalActivo.set('INCIDENCIA');
  }

  confirmarModal(): void {
    if (this.modalActivo() === 'FALLA') {
      const motivoFinal = this.motivoSeleccionado() === 'Otros'
        ? this.textoObservacion()
        : this.motivoSeleccionado();
      this.avanzarParada('FALLA', motivoFinal);
    } else if (this.modalActivo() === 'INCIDENCIA') {
      this.avanzarParada('INCIDENCIA', this.textoObservacion());
    }
    this.modalActivo.set(null);
  }

  private avanzarParada(estado: 'COMPLETADA' | 'FALLA' | 'INCIDENCIA', motivo?: string): void {
    const idx = this.indiceActual();
    const listaActualizada = [...this.paradas()];
    listaActualizada[idx] = { ...listaActualizada[idx], estadoParada: estado, motivo };
    this.paradas.set(listaActualizada);

    const siguienteIdx = idx + 1;
    this.indiceActual.set(siguienteIdx);

    if (siguienteIdx >= listaActualizada.length) {
      const tarea = this.tareaActiva();
      if (tarea) {
        this.choferService.actualizarEstadoTarea(tarea.id, 'COMPLETADO').subscribe();
      }
      if (this.rutaPolyline) {
        this.rutaPolyline.remove();
        this.rutaPolyline = null;
      }
      this.dibujarMarcadoresParadas();
    } else {
      this.actualizarMapaCompleto();
    }
  }

  salir(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}