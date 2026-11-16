// src/app/features/servicios/servicio-form/servicio-form.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiciosService } from '../servicios.service';
import { DireccionNormalizada, GeorefService } from '../../../core/services/georef.service';
import {
  Frecuencia,
  Prioridad,
  ServicioRequest,
  TipoResiduo,
} from '../../../shared/models/servicio.model';
import { Cliente } from '../../../shared/models/cliente.model';
import { Ruta } from '../../../shared/models/ruta.model';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../clientes/cliente.service';
import { RutasService } from '../../rutas/rutas.service';

@Component({
  selector: 'app-servicio-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.css',
})
export class ServicioForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private serviciosService = inject(ServiciosService);
  private georef = inject(GeorefService);
  private clienteService = inject(ClienteService);
  private rutasService = inject(RutasService);

  // null = alta, número = edición
  id: number | null = null;

  guardando = signal(false);
  error = signal('');
  erroresBackend = signal<Record<string, string>>({});

    // Opciones de los desplegables, cargadas desde la API
  clientes = signal<Cliente[]>([]);
  rutas = signal<Ruta[]>([]);
  cargandoOpciones = signal(true);

  // Mismos valores que los enums del backend
  readonly prioridades: Prioridad[] = ['ALTA', 'MEDIA', 'BAJA'];
  readonly tiposResiduo: TipoResiduo[] = ['GENERAL', 'RECICLABLE'];
  readonly frecuencias: Frecuencia[] = ['DIARIA', 'SEMANAL', 'QUINCENAL'];

  // Búsqueda de dirección con Georef
  sugerencias = signal<DireccionNormalizada[]>([]);
  buscando = signal(false);
  avisoDireccion = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    latitud: new FormControl<number | null>(null, Validators.required),
    longitud: new FormControl<number | null>(null, Validators.required),
    prioridad: ['MEDIA' as Prioridad, Validators.required],
    tipoResiduo: ['GENERAL' as TipoResiduo, Validators.required],
    frecuencia: ['DIARIA' as Frecuencia, Validators.required],
    orden: [0, [Validators.required, Validators.min(0)]],
    // 0 = "sin elegir"; min(1) obliga a elegir uno real
    idCliente: [0, Validators.min(1)],
    idRuta: [0, Validators.min(1)],
  });

  get esEdicion() {
    return this.id !== null;
  }

  ngOnInit() {
    this.cargarOpciones();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.id = Number(idParam);
    // El PUT del backend ignora el cliente, así que no dejamos cambiarlo
    this.form.controls.idCliente.disable();

    this.serviciosService.getById(this.id).subscribe({
      next: (s) =>
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
        }),
      error: () => this.error.set('No se pudo cargar el servicio.'),
    });
  }

  private cargarOpciones() {
    this.cargandoOpciones.set(true);

    forkJoin({
      clientes: this.clienteService.obtenerClientes(),
      rutas: this.rutasService.getAll(),
    }).subscribe({
      next: ({ clientes, rutas }) => {
        // Orden alfabético para encontrar rápido en el desplegable
        this.clientes.set([...clientes].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)));
        this.rutas.set([...rutas].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.cargandoOpciones.set(false);
      },
      error: () => {
        this.cargandoOpciones.set(false);
        this.error.set('No se pudieron cargar los clientes y las rutas. Recargá la página.');
      },
    });
  }

  // ---------- Dirección ----------

  buscarDireccion(evento?: Event) {
    evento?.preventDefault(); // que el Enter no envíe el formulario

    const texto = this.form.controls.direccion.value.trim();
    if (texto.length < 3) {
      this.avisoDireccion.set('Escribí calle y altura, por ejemplo "Alem 3800".');
      return;
    }

    this.buscando.set(true);
    this.avisoDireccion.set('');
    this.sugerencias.set([]);

    this.georef.buscarEnMarDelPlata(texto).subscribe({
      next: (lista) => {
        this.buscando.set(false);
        this.sugerencias.set(lista);
        if (lista.length === 0) {
          this.avisoDireccion.set('No se encontró esa dirección en Mar del Plata. Revisá calle y altura.');
        }
      },
      error: () => {
        this.buscando.set(false);
        this.avisoDireccion.set('No se pudo consultar el buscador de direcciones. Probá de nuevo.');
      },
    });
  }

  elegirDireccion(d: DireccionNormalizada) {
    this.form.patchValue({
      direccion: `${d.calle} ${d.altura}`,
      latitud: d.latitud,
      longitud: d.longitud,
    });
    this.sugerencias.set([]);
    this.avisoDireccion.set('');
  }

  // Si el usuario cambia el texto, las coordenadas viejas ya no sirven
  direccionEditada() {
    if (this.form.controls.latitud.value !== null) {
      this.form.patchValue({ latitud: null, longitud: null });
    }
    this.sugerencias.set([]);
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

    // getRawValue incluye el cliente aunque esté deshabilitado
    const v = this.form.getRawValue();
    const body: ServicioRequest = { ...v, latitud: v.latitud!, longitud: v.longitud! };

    const peticion = this.esEdicion
      ? this.serviciosService.actualizar(this.id!, body)
      : this.serviciosService.crear(body);

    peticion.subscribe({
      next: () => this.router.navigate(['/servicios']),
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 400 && err.error && typeof err.error === 'object') {
          this.erroresBackend.set(err.error);
        } else if (err.status === 403) {
          this.error.set('No tenés permiso para realizar esta acción.');
        } else {
          this.error.set('No se pudo guardar el servicio.');
        }
      },
    });
  }
}