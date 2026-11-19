import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Camion } from '../../../shared/models/camion.model';
import { Ruta } from '../../../shared/models/ruta.model';
import { Tarea, TareaRequest } from '../../../shared/models/tarea.model';
import { Usuario } from '../../../shared/models/usuario.model';
import { PatentePipe } from '../../../shared/pipes/patente.pipe';
import { CamionesService } from '../../camiones/camiones.service';
import { RutasService } from '../../rutas/rutas.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { erroresDeCampos, mensajeErrorTarea } from '../tarea-errores';
import { TareasService } from '../tareas.service';
import { normalizar } from '../../../shared/utils/normalizar';

/** 'YYYY-MM-DDTHH:mm' en hora local: toISOString() pasaría a UTC y correría el día. */
function aLocalDatetime(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

/** El atributo min del input se puede saltar escribiendo a mano: validamos también acá. */
function fechaFutura(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (!valor) return null;
    const tiempo = new Date(valor).getTime();
    return Number.isFinite(tiempo) && tiempo > Date.now() ? null : { fechaPasada: true };
  };
}

@Component({
  selector: 'app-tarea-form',
  imports: [ReactiveFormsModule, PatentePipe],
  templateUrl: './tarea-form.html',
  styleUrl: './tarea-form.css',
})
export class TareaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tareasService = inject(TareasService);
  private readonly camionesService = inject(CamionesService);
  private readonly rutasService = inject(RutasService);
  private readonly usuariosService = inject(UsuariosService);

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Tarea>();

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly erroresBackend = signal<Record<string, string>>({});
  readonly fechaMinima = signal('');

  // Opciones de los selects
  readonly camionesDisponibles = signal<Camion[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly choferes = signal<Usuario[]>([]);

  readonly camionBusqueda = signal('');
  readonly camionesDesplegados = signal(false);
  readonly camionesFiltrados = computed(() => {
    const q = normalizar(this.camionBusqueda());
    const coincidentes = q
      ? this.camionesDisponibles().filter((c) => normalizar(`${c.patente} ${c.tipo}`).includes(q))
      : this.camionesDisponibles();
    return coincidentes.slice(0, 12);
  });

  readonly rutaBusqueda = signal('');
  readonly rutasDesplegados = signal(false);
  readonly rutasFiltrados = computed(() => {
    const q = normalizar(this.rutaBusqueda());
    const coincidentes = q
      ? this.rutas().filter((r) => normalizar(r.nombre).includes(q))
      : this.rutas();
    return coincidentes.slice(0, 12);
  });

  readonly choferBusqueda = signal('');
  readonly choferesDesplegados = signal(false);
  readonly choferesFiltrados = computed(() => {
    const q = normalizar(this.choferBusqueda());
    const coincidentes = q
      ? this.choferes().filter((u) =>
          normalizar(`${u.apellido} ${u.nombre} ${u.dni}`).includes(q),
        )
      : this.choferes();
    return coincidentes.slice(0, 12);
  });

  readonly form = this.fb.group({
    descripcion: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    fechaEjecucion: this.fb.nonNullable.control('', [Validators.required, fechaFutura()]),
    idCamion: this.fb.control<number | null>(null, Validators.required),
    idRuta: this.fb.control<number | null>(null, Validators.required),
    idUsuario: this.fb.control<number | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.fechaMinima.set(aLocalDatetime(new Date()));

    // Cada vez que se abre el drawer se piden los datos de nuevo, así la lista de
    // camiones DISPONIBLES refleja lo que pasó mientras tanto (otra tarea creada,
    // un camión liberado, etc.).
    forkJoin({
      camiones: this.camionesService.obtenerTodos(),
      rutas: this.rutasService.getAll(),
      usuarios: this.usuariosService.getAll(),
    }).subscribe({
      next: ({ camiones, rutas, usuarios }) => {
        this.camionesDisponibles.set(
          camiones
            .filter((c) => c.estadoCamion === 'DISPONIBLE')
            .sort((a, b) => a.patente.localeCompare(b.patente, 'es')),
        );
        this.rutas.set([...rutas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        
        this.choferes.set(
          usuarios
            .filter((u) => u.rol === 'EMPLEADO' && u.activo)
            .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es')),
        );
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar los camiones, rutas y choferes.');
      },
    });

    // Al elegir una ruta se sugiere su chofer, salvo que ya se haya elegido uno a mano.
    this.form.controls.idRuta.valueChanges.subscribe((idRuta) => {
      const ruta = this.rutas().find((r) => r.idRuta === idRuta);
      const chofer = this.form.controls.idUsuario;
      if (ruta && chofer.pristine && this.choferes().some((c) => c.id === ruta.idChofer)) {
        chofer.setValue(ruta.idChofer);
      }
    });

    // La sugerencia automática de chofer también se refleja en el texto del buscador.
    // Si el id se limpia al escribir, no tocamos el texto que el usuario está tipiando.
    this.form.controls.idUsuario.valueChanges.subscribe((idUsuario) => {
      if (idUsuario === null) return;
      const chofer = this.choferes().find((u) => u.id === idUsuario);
      if (chofer) this.choferBusqueda.set(this.etiquetaChofer(chofer));
    });
  }

  // ---------- Selección con búsqueda (camión, ruta y chofer) ----------

  onCamionBusqueda(valor: string): void {
    this.camionBusqueda.set(valor);
    this.camionesDesplegados.set(true);
    const seleccionado = this.camionesDisponibles().find(
      (c) => c.id === this.form.controls.idCamion.value,
    );
    if (!seleccionado || normalizar(seleccionado.patente) !== normalizar(valor)) {
      this.form.controls.idCamion.setValue(null);
    }
  }

  elegirCamion(camion: Camion, evento?: Event): void {
    evento?.preventDefault();
    this.form.controls.idCamion.setValue(camion.id);
    this.form.controls.idCamion.markAsTouched();
    this.form.controls.idCamion.markAsDirty();
    this.camionBusqueda.set(this.etiquetaCamion(camion));
    this.camionesDesplegados.set(false);
  }

  elegirPrimerCamion(evento: Event): void {
    const primero = this.camionesFiltrados()[0];
    if (primero) {
      evento.preventDefault();
      this.elegirCamion(primero);
    }
  }

  etiquetaCamion(camion: Camion): string {
    return camion.patente;
  }

  onRutaBusqueda(valor: string): void {
    this.rutaBusqueda.set(valor);
    this.rutasDesplegados.set(true);
    const seleccionada = this.rutas().find((r) => r.idRuta === this.form.controls.idRuta.value);
    if (!seleccionada || normalizar(seleccionada.nombre) !== normalizar(valor)) {
      this.form.controls.idRuta.setValue(null);
    }
  }

  elegirRuta(ruta: Ruta, evento?: Event): void {
    evento?.preventDefault();
    this.form.controls.idRuta.setValue(ruta.idRuta);
    this.form.controls.idRuta.markAsTouched();
    this.form.controls.idRuta.markAsDirty();
    this.rutaBusqueda.set(ruta.nombre);
    this.rutasDesplegados.set(false);
  }

  elegirPrimerRuta(evento: Event): void {
    const primera = this.rutasFiltrados()[0];
    if (primera) {
      evento.preventDefault();
      this.elegirRuta(primera);
    }
  }

  onChoferBusqueda(valor: string): void {
    this.choferBusqueda.set(valor);
    this.choferesDesplegados.set(true);
    const seleccionado = this.choferes().find((u) => u.id === this.form.controls.idUsuario.value);
    if (!seleccionado || normalizar(this.etiquetaChofer(seleccionado)) !== normalizar(valor)) {
      this.form.controls.idUsuario.setValue(null);
    }
  }

  elegirChofer(chofer: Usuario, evento?: Event): void {
    evento?.preventDefault();
    this.form.controls.idUsuario.setValue(chofer.id);
    this.form.controls.idUsuario.markAsTouched();
    this.form.controls.idUsuario.markAsDirty();
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

  etiquetaChofer(chofer: Usuario): string {
    return `${chofer.apellido}, ${chofer.nombre}`;
  }

  guardar(): void {
    this.error.set('');
    this.erroresBackend.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body: TareaRequest = {
      descripcion: v.descripcion.trim(),
      fechaEjecucion: this.aFechaHora(v.fechaEjecucion),
      estado: 'PENDIENTE',
      idCamion: v.idCamion!,
      idRuta: v.idRuta!,
      idUsuario: v.idUsuario!,
    };

    this.guardando.set(true);
    this.tareasService.crearTarea(body).subscribe({
      next: (tarea) => {
        this.guardando.set(false);
        this.guardado.emit(tarea);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);

        // Validación de campos: se muestra debajo de cada input
        const campos = erroresDeCampos(err);
        if (campos) {
          this.erroresBackend.set(campos);
          return;
        }

        // Errores de negocio (ej. camión no disponible): se muestran arriba del form
        this.error.set(mensajeErrorTarea(err, 'crear la tarea'));
      },
    });
  }

  cancelar(): void {
    this.cerrar.emit();
  }

  /**
   * El <input type="datetime-local"> entrega '2026-11-17T07:30' (sin segundos),
   * pero el back espera un LocalDateTime completo: '2026-11-17T07:30:00'.
   */
  private aFechaHora(valor: string): string {
    return valor.length === 16 ? `${valor}:00` : valor;
  }
}
