import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import * as L from 'leaflet';

import { ChoferService, RutaChofer, ServicioParada, TareaActiva } from '../../core/services/chofer.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { RutasService } from '../rutas/rutas.service';
import { CamionesService } from '../camiones/camiones.service';
import { Ruta } from '../../shared/models/ruta.model';
import { Camion } from '../../shared/models/camion.model';

export interface DiaSemanaCard {
  nombreDia: string;
  abreviatura: string;
  fechaIso: string;       // YYYY-MM-DD (local)
  fechaCorta: string;     // DD/MM
  esHoy: boolean;
  esPasado: boolean;
  tarea: TareaActiva | null;
  nombreRuta: string;
  patenteCamion: string;
  horaEjecucion: string;
}

@Component({
  selector: 'app-ruta-chofer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ruta-chofer.html',
  styleUrl: './ruta-chofer.css'
})
export class RutaChoferComponent implements OnInit, OnDestroy {
  private choferService = inject(ChoferService);
  private rutasService = inject(RutasService);
  private camionesService = inject(CamionesService);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private http = inject(HttpClient);

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private camionMarker: L.Marker | null = null;
  private paradasLayer = L.layerGroup();
  private rutaPolyline: L.Polyline | null = null;

  // Control de pantalla: 'DIAS' (inicio semanal) o 'MAPA' (recorrido en ejecución)
  vista = signal<'DIAS' | 'MAPA'>('DIAS');

  tareasChofer = signal<TareaActiva[]>([]);
  rutasCatalogo = signal<Ruta[]>([]);
  camionesCatalogo = signal<Camion[]>([]);

  ruta = signal<RutaChofer | null>(null);
  tareaActiva = signal<TareaActiva | null>(null);
  paradas = signal<ServicioParada[]>([]);
  indiceActual = signal<number>(0);

  // Base de la empresa en Av. M. Champagnat 3625
  ubicacionCamion = signal<{ lat: number; lng: number }>({ lat:  -37.9972, lng: -57.5973 });

  cargando = signal<boolean>(true);
  cargandoMapa = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  modalActivo = signal<'FALLA' | 'INCIDENCIA' | null>(null);
  listaAbierta = signal<boolean>(false);
  motivoSeleccionado = signal<string>('Candado Propio');
  textoObservacion = signal<string>('');

  motivosFalla = [
    'Candado Propio',
    'Lleno de Escombros',
    'Hongos rotos',
    'Vehículo obstruyendo',
    'Otros'
  ];

  // Genera los 7 días de la semana actual (Lunes a Domingo) usando fecha local
  diasSemana = computed<DiaSemanaCard[]>(() => {
    const hoy = new Date();
    const hoyIso = this.formatearFechaLocal(hoy);

    // Calcular lunes de esta semana (getDay(): 0=Dom, 1=Lun ... 6=Sab)
    const diaSemana = hoy.getDay();
    const diffALunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diffALunes);

    const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const abrevs = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    const tareas = this.tareasChofer();
    const rutasMap = new Map(this.rutasCatalogo().map((r) => [r.idRuta, r.nombre]));
    const camionesMap = new Map(this.camionesCatalogo().map((c) => [c.id, c.patente]));

    return nombres.map((nombreDia, idx) => {
      const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + idx);
      const fechaIso = this.formatearFechaLocal(fecha);
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0');

      const tareaDia = tareas.find((t) => (t.fechaEjecucion ?? '').slice(0, 10) === fechaIso) ?? null;

      return {
        nombreDia,
        abreviatura: abrevs[idx],
        fechaIso,
        fechaCorta: `${dd}/${mm}`,
        esHoy: fechaIso === hoyIso,
        esPasado: fechaIso < hoyIso,
        tarea: tareaDia,
        nombreRuta: tareaDia ? (rutasMap.get(tareaDia.idRuta) ?? `Ruta #${tareaDia.idRuta}`) : '',
        patenteCamion: tareaDia ? (camionesMap.get(tareaDia.idCamion) ?? '') : '',
        horaEjecucion: (tareaDia?.fechaEjecucion?.length ?? 0) >= 16 ? tareaDia!.fechaEjecucion.slice(11, 16) : ''
      };
    });
  });

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
    this.cargarSemanaChofer();
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.destruirMapa();
  }

  private destruirMapa(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.camionMarker = null;
      this.rutaPolyline = null;
    }
  }

  cargarSemanaChofer(): void {
    const choferId = Number(localStorage.getItem('user_id'));
    if (!choferId) {
      this.errorMsg.set('No se encontró el ID del chofer en sesión.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    forkJoin({
      tareas: this.choferService.obtenerMisTareasActivas(choferId).pipe(catchError(() => of([]))),
      rutas: this.rutasService.getAll().pipe(catchError(() => of([]))),
      camiones: this.camionesService.obtenerTodos().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ tareas, rutas, camiones }) => {
        this.tareasChofer.set(tareas);
        this.rutasCatalogo.set(rutas);
        this.camionesCatalogo.set(camiones);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar tus recorridos de la semana.');
        this.cargando.set(false);
      }
    });
  }

  seleccionarDia(dia: DiaSemanaCard): void {
    if (!dia.tarea) return;

    const tarea = dia.tarea;
    const choferId = Number(localStorage.getItem('user_id'));

    this.tareaActiva.set(tarea);
    this.indiceActual.set(0);
    this.paradas.set([]);
    this.errorMsg.set(null);
    this.cargandoMapa.set(true);
    this.vista.set('MAPA');

    // Esperar a que Angular renderice el contenedor #mapContainer del @if (vista() === 'MAPA')
    setTimeout(() => this.inicializarMapa(), 0);

    if (tarea.estado === 'PENDIENTE') {
      this.choferService.actualizarEstadoTarea(tarea.id, 'EN_CURSO').subscribe({
        next: (actualizada) => {
          this.tareaActiva.set(actualizada);
          this.tareasChofer.update((lista) =>
            lista.map((t) => (t.id === actualizada.id ? actualizada : t))
          );
        }
      });
    }

    // Buscar la ruta correspondiente a la tarea elegida (con fallback a obtenerMiRuta)
    this.choferService.obtenerRutaPorId(tarea.idRuta).pipe(
      catchError(() => this.choferService.obtenerMiRuta(choferId))
    ).subscribe({
      next: (rutaData) => {
        this.ruta.set(rutaData);
        const serviciosOrdenados = [...(rutaData.servicios ?? [])].sort(
          (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
        );
        const paradasInit = serviciosOrdenados.map((s) => ({
          ...s,
          latitud: s.latitud && s.latitud !== 0 ? s.latitud : -37.9818,
          longitud: s.longitud && s.longitud !== 0 ? s.longitud : -57.5878,
          estadoParada: 'PENDIENTE' as const
        }));
        this.paradas.set(paradasInit);
        this.cargandoMapa.set(false);
        this.actualizarMapaCompleto();
      },
      error: (err) => {
        this.errorMsg.set(err.error?.error || 'No se pudo cargar el detalle de la ruta asignada.');
        this.cargandoMapa.set(false);
      }
    });
  }

  volverADias(): void {
    this.listaAbierta.set(false);
    this.destruirMapa();
    this.vista.set('DIAS');
    this.cargarSemanaChofer();
  }

  irAParada(index: number): void {
    this.indiceActual.set(index);
    this.listaAbierta.set(false);
    this.actualizarMapaCompleto();
  }

  private inicializarMapa(): void {
    if (!this.mapContainer || this.map) return;

    const inicio = this.ubicacionCamion();

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [inicio.lat, inicio.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.paradasLayer.addTo(this.map);

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
          if (this.vista() === 'MAPA') {
            this.trazarRutaEnMapa();
          }
        },
        (err) => console.warn('GPS no disponible, usando ubicación por defecto:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
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
    const puntos = [
      `${origen.lng},${origen.lat}`,
      ...pendientes.map((p) => `${p.longitud},${p.latitud}`)
    ].join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${puntos}?overview=full&geometries=geojson`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (!this.map || !res?.routes?.length) return;

        const coords: [number, number][] = res.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        if (this.rutaPolyline) {
          this.rutaPolyline.remove();
        }
        this.rutaPolyline = L.polyline(coords, {
          color: '#1a73e8',
          weight: 6,
          opacity: 0.9
        }).addTo(this.map);
      },
      error: () => {
        if (!this.map) return;
        const fallbackCoords: [number, number][] = [
          [origen.lat, origen.lng],
          ...pendientes.map((p) => [p.latitud, p.longitud] as [number, number])
        ];
        if (this.rutaPolyline) {
          this.rutaPolyline.remove();
        }
        this.rutaPolyline = L.polyline(fallbackCoords, {
          color: '#1a73e8',
          weight: 5,
          dashArray: '8, 8'
        }).addTo(this.map);
      }
    });
  }

  abrirNavegacionGps(): void {
    const actual = this.paradaActual();
    if (!actual) return;
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
    this.textoObservacion.set(this.paradaActual()?.motivo ?? '');
    this.modalActivo.set('INCIDENCIA');
  }

  confirmarModal(): void {
    if (this.modalActivo() === 'FALLA') {
      const motivoFinal = this.motivoSeleccionado() === 'Otros'
        ? this.textoObservacion()
        : this.motivoSeleccionado();
      this.avanzarParada('FALLA', motivoFinal);
    } else if (this.modalActivo() === 'INCIDENCIA') {
      const obs = this.textoObservacion().trim();
      const idx = this.indiceActual();
      const listaActualizada = [...this.paradas()];
      listaActualizada[idx] = { ...listaActualizada[idx], motivo: obs || undefined };
      this.paradas.set(listaActualizada);
      if (obs) {
        this.alertService.toastInfo('Observación guardada en esta parada');
      }
    }
    this.modalActivo.set(null);
  }

  private avanzarParada(estado: 'COMPLETADA' | 'FALLA', motivo?: string): void {
    const idx = this.indiceActual();
    const listaActualizada = [...this.paradas()];
    const obsPrevia = listaActualizada[idx].motivo;
    const detalleFinal = motivo
      ? (obsPrevia ? `${motivo} (${obsPrevia})` : motivo)
      : obsPrevia;

    listaActualizada[idx] = {
      ...listaActualizada[idx],
      estadoParada: estado,
      motivo: detalleFinal
    };
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
      this.alertService.toastExito('¡Recorrido finalizado con éxito!');
    } else {
      const etiqueta = estado === 'COMPLETADA' ? 'Parada completada' : 'Falla registrada';
      this.alertService.toastInfo(etiqueta);
      this.actualizarMapaCompleto();
    }
  }

  private formatearFechaLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async salir(): Promise<void> {
    const confirmado = await this.alertService.confirmarLogout();
    if (!confirmado) return;

    this.authService.logout();
    this.alertService.toastInfo('Sesión cerrada');
    this.router.navigate(['/login']);
  }
}