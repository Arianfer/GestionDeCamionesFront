import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter, forkJoin, switchMap, tap } from 'rxjs';
import * as L from 'leaflet';
import { ServiciosService } from '../servicios.service';
import { ClienteService } from '../../clientes/cliente.service';
import { RutasService } from '../../rutas/rutas.service';
import { DireccionNormalizada, GeorefService } from '../../../core/services/georef.service';
import { mensajeError } from '../../../shared/utils/mensaje-error';
import {
  Frecuencia,
  Prioridad,
  Servicio,
  ServicioRequest,
  TipoResiduo,
} from '../../../shared/models/servicio.model';
import { Cliente } from '../../../shared/models/cliente.model';
import { Ruta } from '../../../shared/models/ruta.model';
import { AlertService } from '../../../core/services/alert.service';


@Component({
  selector: 'app-servicio-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.css',
})
export class ServicioForm implements OnInit, AfterViewInit, OnDestroy {
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private serviciosService = inject(ServiciosService);
  private georef = inject(GeorefService);
  private clienteService = inject(ClienteService);
  private rutasService = inject(RutasService);

  @Input() servicioId: number | null = null;
  @Input() embebido = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Servicio>();

  @ViewChild('mapaPin') mapaContenedor?: ElementRef<HTMLDivElement>;
  private map?: L.Map;
  private marker?: L.Marker;
  private readonly CENTRO_MDP: L.LatLngExpression = [-38.0055, -57.5426];

  id: number | null = null;

  guardando = signal(false);
  error = signal('');
  erroresBackend = signal<Record<string, string>>({});

  clientes = signal<Cliente[]>([]);
  rutas = signal<Ruta[]>([]);
  cargandoOpciones = signal(true);
  private ultimosOrdenes = signal<Map<number, number>>(new Map());
  private subRuta?: Subscription;

  readonly prioridades: Prioridad[] = ['ALTA', 'MEDIA', 'BAJA'];
  readonly tiposResiduo: TipoResiduo[] = ['GENERAL', 'RECICLABLE'];
  readonly frecuencias: Frecuencia[] = ['DIARIA', 'SEMANAL', 'QUINCENAL'];

  // Autocompletado de dirección
  sugerencias = signal<DireccionNormalizada[]>([]);
  buscando = signal(false);
  avisoDireccion = signal('');
  private busqueda$ = new Subject<string>();
  private subBusqueda?: Subscription;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    latitud: new FormControl<number | null>(null, Validators.required),
    longitud: new FormControl<number | null>(null, Validators.required),
    prioridad: ['MEDIA' as Prioridad, Validators.required],
    tipoResiduo: ['GENERAL' as TipoResiduo, Validators.required],
    frecuencia: ['DIARIA' as Frecuencia, Validators.required],
    orden: [0, [Validators.required, Validators.min(0)]],
    idCliente: [0, Validators.min(1)],
    idRuta: [0, Validators.min(1)],
  });

  get esEdicion() {
    return this.id !== null;
  }

  ngOnInit() {
    this.configurarAutocompletado();
    this.configurarOrdenAutomatico();
    this.cargarOpciones();

    const idParam = this.embebido
      ? this.servicioId
      : this.route.snapshot.paramMap.get('id')
        ? Number(this.route.snapshot.paramMap.get('id'))
        : null;

    if (idParam === null) return;

    this.id = idParam;
    this.form.controls.idCliente.disable();

    this.serviciosService.getById(this.id).subscribe({
      next: (s) => {
        this.form.patchValue({
          nombre: s.nombre,
          direccion: s.direccion,
          latitud: s.latitud,
          longitud: s.longitud,
          prioridad: s.prioridad,
          tipoResiduo: s.tipoResiduo,
          frecuencia: s.frecuencia,
          orden: s.orden,
          idCliente: s.idCliente,
          idRuta: s.idRuta,
        });
        this.actualizarPinMapa(s.latitud, s.longitud, 16);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'cargar el servicio'));
        this.form.disable();
      },
    });
  }

  ngAfterViewInit() {
    this.inicializarMapa();
  }

  ngOnDestroy() {
    this.subBusqueda?.unsubscribe();
    this.subRuta?.unsubscribe();
    this.map?.remove();
  }

  // ---------- Mapa interactivo con pin arrastrable ----------

  private inicializarMapa() {
    if (!this.mapaContenedor) return;

    const lat = this.form.controls.latitud.value;
    const lon = this.form.controls.longitud.value;
    const tieneCoords = lat !== null && lon !== null;

    this.map = L.map(this.mapaContenedor.nativeElement, {
      center: tieneCoords ? [lat!, lon!] : this.CENTRO_MDP,
      zoom: tieneCoords ? 16 : 12,
      scrollWheelZoom: !this.embebido,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    // Permitir hacer clic directo en cualquier esquina/puerta del mapa para clavar el pin
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.form.disabled) return;
      this.actualizarCoordenadasDesdeMapa(e.latlng.lat, e.latlng.lng);
    });

    if (tieneCoords) {
      this.actualizarPinMapa(lat!, lon!, 16);
    }

    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private actualizarPinMapa(lat: number, lon: number, zoom = 16) {
    if (!this.map) return;

    const pos: L.LatLngExpression = [lat, lon];

    if (!this.marker) {
      const iconoPin = L.divIcon({
        className: 'pin-ubicacion-custom',
        html: `<div style="
          width: 24px; height: 24px;
          background: #1b5e20;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.45);
          cursor: grab;
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      this.marker = L.marker(pos, { draggable: true, icon: iconoPin }).addTo(this.map);
      this.marker.on('dragend', () => {
        const nuevaPos = this.marker!.getLatLng();
        this.actualizarCoordenadasDesdeMapa(nuevaPos.lat, nuevaPos.lng);
      });
    } else {
      this.marker.setLatLng(pos);
    }

    this.map.setView(pos, zoom);
  }

  private actualizarCoordenadasDesdeMapa(lat: number, lon: number) {
    const latRedondeada = Number(lat.toFixed(6));
    const lonRedondeada = Number(lon.toFixed(6));

    this.form.patchValue({
      latitud: latRedondeada,
      longitud: lonRedondeada,
    });
    this.actualizarPinMapa(latRedondeada, lonRedondeada, this.map?.getZoom() ?? 16);
  }

  // ---------- Autocompletado ----------

  private configurarAutocompletado() {
    this.subBusqueda = this.busqueda$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        tap((texto) => {
          if (texto.trim().length < 3) {
            this.sugerencias.set([]);
            this.buscando.set(false);
          }
        }),
        filter((texto) => texto.trim().length >= 3),
        tap(() => {
          this.buscando.set(true);
          this.avisoDireccion.set('');
        }),
        switchMap((texto) => this.georef.buscarEnZona(texto))
      )
      .subscribe({
        next: (lista) => {
          this.buscando.set(false);
          this.sugerencias.set(lista);
          if (lista.length === 0) {
            this.avisoDireccion.set('No se encontraron coincidencias. Podés marcar el punto directo en el mapa.');
          }
        },
        error: () => {
          this.buscando.set(false);
          this.avisoDireccion.set('Error al buscar dirección. Marcá el punto directo en el mapa.');
        },
      });
  }

  private configurarOrdenAutomatico() {
    this.subRuta = this.form.controls.idRuta.valueChanges.subscribe((idRuta) => {
      if (this.esEdicion) return;
      this.form.controls.orden.setValue(idRuta > 0 ? this.siguienteOrden(idRuta) : 0);
    });
  }

  private siguienteOrden(idRuta: number): number {
    return (this.ultimosOrdenes().get(idRuta) ?? 0) + 1;
  }

  private actualizarOrdenAutomatico() {
    if (this.esEdicion) return;

    const idRuta = this.form.controls.idRuta.value;
    if (idRuta > 0) {
      this.form.controls.orden.setValue(this.siguienteOrden(idRuta));
    }
  }

  private calcularUltimosOrdenes(servicios: Servicio[]) {
    const ultimos = new Map<number, number>();

    for (const servicio of servicios) {
      if (!servicio.idRuta) continue;

      const actual = ultimos.get(servicio.idRuta) ?? 0;
      if (servicio.orden > actual) {
        ultimos.set(servicio.idRuta, servicio.orden);
      }
    }

    this.ultimosOrdenes.set(ultimos);
  }

  private cargarOpciones() {
    this.cargandoOpciones.set(true);

    forkJoin({
      clientes: this.clienteService.obtenerClientes(),
      rutas: this.rutasService.getAll(),
      servicios: this.serviciosService.getAll(),
    }).subscribe({
      next: ({ clientes, rutas, servicios }) => {
        this.clientes.set([...clientes].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)));
        this.rutas.set([...rutas].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.calcularUltimosOrdenes(servicios);
        this.actualizarOrdenAutomatico();
        this.cargandoOpciones.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoOpciones.set(false);
        this.error.set(mensajeError(err, 'cargar las opciones del formulario'));
      },
    });
  }

  buscarDireccion(evento?: Event) {
    evento?.preventDefault();
    const texto = this.form.controls.direccion.value.trim();
    if (texto.length < 3) {
      this.avisoDireccion.set('Escribí calle y altura, por ejemplo "Alem 3800".');
      return;
    }
    this.busqueda$.next(texto);
  }

  elegirDireccion(d: DireccionNormalizada) {
    this.form.patchValue({
      direccion: d.direccionFormateada,
      latitud: d.latitud,
      longitud: d.longitud,
    });
    this.sugerencias.set([]);
    this.avisoDireccion.set('');
    this.actualizarPinMapa(d.latitud, d.longitud, 16);
  }

  direccionEditada() {
    const texto = this.form.controls.direccion.value;
    this.avisoDireccion.set('');
    this.busqueda$.next(texto);
  }

  tieneUbicacion(): boolean {
    return this.form.controls.latitud.value !== null && this.form.controls.longitud.value !== null;
  }

  // ---------- Guardar ----------

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.erroresBackend.set({});

    const v = this.form.getRawValue();
    const body: ServicioRequest = { ...v, latitud: v.latitud!, longitud: v.longitud! };

    const peticion = this.esEdicion
      ? this.serviciosService.actualizar(this.id!, body)
      : this.serviciosService.crear(body);

    peticion.subscribe({
      next: (servicio) => {
        this.guardando.set(false);

        if (this.embebido) {
          this.guardado.emit(servicio);
          return;
        }

        this.alertService.toastExito(
          this.esEdicion ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente',
        );
        this.router.navigate(['/servicios']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const esValidacion =
          err.status === 400 &&
          err.error &&
          typeof err.error === 'object' &&
          typeof err.error.error !== 'string';

        if (esValidacion) {
          this.erroresBackend.set(err.error);
          this.error.set('Revisá los campos marcados.');
        } else {
          this.error.set(mensajeError(err, 'guardar el servicio'));
        }
      },
    });
  }

  cancelar(): void {
    if (this.embebido) this.cerrar.emit();
  }
}