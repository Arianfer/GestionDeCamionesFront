import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RutasService } from '../rutas.service';
import { Ruta, RutaRequest } from '../../../shared/models/ruta.model';
import { Servicio } from '../../../shared/models/servicio.model';
import { Usuario } from '../../../shared/models/usuario.model';
import { erroresDeValidacion, mensajeError } from '../../../shared/utils/mensaje-error';
import { normalizar } from '../../../shared/utils/normalizar';

@Component({
  selector: 'app-ruta-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ruta-form.html',
  styleUrl: './ruta-form.css',
})
export class RutaForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rutasService = inject(RutasService);

  // Uso embebido (drawer): id recibido por input y eventos en lugar de navegación
  @Input() rutaId: number | null = null;
  @Input() embebido = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Ruta>();
  @Output() reordenado = new EventEmitter<Servicio[]>();

  // null = alta, número = edición
  id: number | null = null;

  guardando = signal(false);
  error = signal('');
  erroresBackend = signal<Record<string, string>>({});

  // Choferes disponibles para el selector
  usuarios = signal<Usuario[]>([]);
  choferes = computed(() =>
    this.usuarios().filter((u) => u.rol === 'EMPLEADO' && u.activo),
  );
  choferBusqueda = signal('');
  choferesDesplegados = signal(false);
  choferesFiltrados = computed(() => {
    const q = normalizar(this.choferBusqueda());
    const coincidentes = q
      ? this.choferes().filter((u) =>
          normalizar(`${u.apellido} ${u.nombre} ${u.dni}`).includes(q),
        )
      : this.choferes();
    return coincidentes.slice(0, 12);
  });

  // Servicios de la ruta (solo en edición) y estado del reordenamiento
  servicios = signal<Servicio[]>([]);
  guardandoOrden = signal(false);
  mensajeOrden = signal('');
  errorOrden = signal(false);
  arrastrando = signal<number | null>(null);
  destinoArrastre = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    descripcion: ['', [Validators.required, Validators.maxLength(400)]],
    // fecha de hoy en formato YYYY-MM-DD, en hora local
    fecha: [new Date().toLocaleDateString('en-CA'), Validators.required],
    idChofer: [null as number | null, Validators.required],
  });

  get esEdicion() {
    return this.id !== null;
  }

  ngOnInit() {
    this.rutasService.obtenerChoferes().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.sincronizarTextoChofer();
      },
      error: (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'cargar los choferes')),
    });

    const idParam = this.embebido
      ? this.rutaId
      : this.route.snapshot.paramMap.get('id')
        ? Number(this.route.snapshot.paramMap.get('id'))
        : null;

    if (idParam !== null) {
      this.id = idParam;
      this.rutasService.getById(this.id).subscribe({
        next: (r) => {
          this.form.patchValue({
            nombre: r.nombre,
            descripcion: r.descripcion,
            fecha: r.fecha ?? '',
            idChofer: r.idChofer,
          });
          // servicios puede venir null; los ordeno por "orden"
          this.sincronizarTextoChofer();
          this.servicios.set(
            [...(r.servicios ?? [])].sort((a, b) => a.orden - b.orden),
          );
        },
        error: (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'cargar la ruta')),
      });
    }
  }

  // ---------- Selección de chofer con búsqueda ----------

  onChoferBusqueda(valor: string): void {
    this.choferBusqueda.set(valor);
    this.choferesDesplegados.set(true);

    const seleccionado = this.choferes().find((u) => u.id === this.form.controls.idChofer.value);
    if (!seleccionado || normalizar(this.etiquetaChofer(seleccionado)) !== normalizar(valor)) {
      this.form.controls.idChofer.setValue(null);
    }
  }

  elegirChofer(chofer: Usuario, evento?: Event): void {
    evento?.preventDefault();
    this.form.controls.idChofer.setValue(chofer.id);
    this.form.controls.idChofer.markAsTouched();
    this.form.controls.idChofer.markAsDirty();
    this.choferBusqueda.set(this.etiquetaChofer(chofer));
    this.choferesDesplegados.set(false);
  }

  elegirPrimerChofer(evento: Event): void {
    const primero = this.choferesFiltrados()[0];
    if (primero) {
      evento.preventDefault();
      this.elegirChofer(primero);
    }
  }

  sincronizarTextoChofer(): void {
    const chofer = this.choferes().find((u) => u.id === this.form.controls.idChofer.value);
    if (chofer) this.choferBusqueda.set(this.etiquetaChofer(chofer));
  }

  etiquetaChofer(u: Usuario): string {
    return `${u.apellido}, ${u.nombre} (${u.dni})`;
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.erroresBackend.set({});

    const v = this.form.getRawValue();
    const body: RutaRequest = {
      nombre: v.nombre,
      descripcion: v.descripcion,
      fecha: v.fecha,
      idChofer: v.idChofer!,
    };

    const peticion = this.esEdicion
      ? this.rutasService.actualizar(this.id!, body)
      : this.rutasService.crear(body);

    peticion.subscribe({
      next: (r) => {
        if (this.embebido) {
          this.guardando.set(false);
          this.guardado.emit(r);
        } else {
          this.router.navigate(['/rutas']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const campos = erroresDeValidacion(err);
        if (campos) {
          this.erroresBackend.set(campos);
          this.error.set('Revisá los campos marcados.');
        } else {
          // 409 "Ya existe una ruta con el nombre…", 400 "El usuario asignado no es un Chofer", etc.
          this.error.set(mensajeError(err, 'guardar la ruta'));
        }
      },
    });
  }

  cancelar() {
    if (this.embebido) {
      this.cerrar.emit();
    }
  }

  // ---- Reordenar servicios ----

  iniciarArrastre(indice: number, evento: DragEvent) {
    if (this.guardandoOrden()) {
      evento.preventDefault();
      return;
    }

    this.arrastrando.set(indice);
    this.destinoArrastre.set(indice);
    this.mensajeOrden.set('');
    this.errorOrden.set(false);

    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
      evento.dataTransfer.setData('text/plain', String(indice));
    }
  }

  sobreServicio(indice: number, evento: DragEvent) {
    if (this.arrastrando() === null || this.guardandoOrden()) return;

    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move';
    this.destinoArrastre.set(indice);
  }

  soltarServicio(indice: number, evento: DragEvent) {
    evento.preventDefault();

    const origen = this.arrastrando();
    this.limpiarArrastre();

    if (origen === null || origen === indice || this.guardandoOrden()) return;
    this.reordenar(origen, indice);
  }

  finalizarArrastre() {
    this.limpiarArrastre();
  }

  private limpiarArrastre() {
    this.arrastrando.set(null);
    this.destinoArrastre.set(null);
  }

  private reordenar(origen: number, destino: number) {
    const anterior = this.servicios();
    const lista = [...anterior];
    const [servicio] = lista.splice(origen, 1);
    lista.splice(destino, 0, servicio);

    const actualizados = lista.map((s, i) => ({ ...s, orden: i + 1 }));

    this.servicios.set(actualizados);
    this.reordenado.emit(actualizados);
    this.guardandoOrden.set(true);
    this.errorOrden.set(false);
    this.mensajeOrden.set('Guardando orden...');

    this.rutasService.reordenarServicios(actualizados.map((s) => s.id)).subscribe({
      next: () => {
        this.guardandoOrden.set(false);
        this.mensajeOrden.set('Orden actualizado.');
      },
      error: (err: HttpErrorResponse) => {
        this.servicios.set(anterior);
        this.reordenado.emit(anterior);
        this.guardandoOrden.set(false);
        this.errorOrden.set(true);
        this.mensajeOrden.set(mensajeError(err, 'guardar el orden'));
      },
    });
  }
}