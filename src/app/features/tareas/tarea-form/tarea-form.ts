import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  // Opciones de los selects
  readonly camionesDisponibles = signal<Camion[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly choferes = signal<Usuario[]>([]);

  readonly form = this.fb.group({
    descripcion: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    fechaEjecucion: this.fb.nonNullable.control('', Validators.required),
    idCamion: this.fb.control<number | null>(null, Validators.required),
    idRuta: this.fb.control<number | null>(null, Validators.required),
    idUsuario: this.fb.control<number | null>(null, Validators.required),
  });

  ngOnInit(): void {
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
