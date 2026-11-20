import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AlertService } from '../../../core/services/alert.service';
import { PaginadorComponent } from '../../../shared/paginador/paginador';
import { Camion } from '../../../shared/models/camion.model';
import { Ruta } from '../../../shared/models/ruta.model';
import { EstadoTarea, Tarea } from '../../../shared/models/tarea.model';
import { Usuario } from '../../../shared/models/usuario.model';
import { PatentePipe } from '../../../shared/pipes/patente.pipe';
import { CamionesService } from '../../camiones/camiones.service';
import { RutasService } from '../../rutas/rutas.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { TareaForm } from '../tarea-form/tarea-form';
import { mensajeErrorTarea } from '../tarea-errores';
import { ESTADOS_TAREA, accionEstado, etiquetaEstado, siguientesDe } from '../tarea-estados';
import { TareasService } from '../tareas.service';

@Component({
  selector: 'app-tarea-list',
  imports: [DatePipe, PatentePipe, TareaForm, PaginadorComponent],
  templateUrl: './tarea-list.html',
  styleUrl: './tarea-list.css',
})
export class TareaList implements OnInit, OnDestroy {
  private readonly tareasService = inject(TareasService);
  private readonly camionesService = inject(CamionesService);
  private readonly rutasService = inject(RutasService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly alertService = inject(AlertService);

  readonly estados = ESTADOS_TAREA;

  readonly tareas = signal<Tarea[]>([]);
  readonly camiones = signal<Camion[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly usuarios = signal<Usuario[]>([]);

  readonly filtro = signal('');
  readonly estadoFiltro = signal<EstadoTarea | ''>('');
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly drawerAbierto = signal(false);
  readonly cambiandoId = signal<number | null>(null);

  readonly paginaActual = signal(1);
  readonly itemsPorPagina = 9;

  private readonly patentePipe = new PatentePipe();
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly onVisibilityChange = () => {
    if (!document.hidden) {
      this.refrescarSilencioso();
    }
  };

  private readonly camionesPorId = computed(
    () => new Map(this.camiones().map((c) => [c.id, c] as const)),
  );
  private readonly rutasPorId = computed(
    () => new Map(this.rutas().map((r) => [r.idRuta, r] as const)),
  );
  private readonly usuariosPorId = computed(
    () => new Map(this.usuarios().map((u) => [u.id, u] as const)),
  );

  readonly filtradas = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const qPatente = q.replace(/\s/g, '').toUpperCase();
    const estado = this.estadoFiltro();

    return this.tareas().filter((t) => {
      if (estado && t.estado !== estado) return false;
      if (!q) return true;

      return (
        String(t.id) === q ||
        `tar-${t.id}` === q ||
        (t.descripcion ?? '').toLowerCase().includes(q) ||
        this.patente(t).toUpperCase().includes(qPatente) ||
        this.nombreRuta(t).toLowerCase().includes(q) ||
        this.nombreChofer(t).toLowerCase().includes(q) ||
        etiquetaEstado(t.estado).toLowerCase().includes(q)
      );
    });
  });

  readonly paginadas = computed(() => {
    const totalPaginas = Math.max(1, Math.ceil(this.filtradas().length / this.itemsPorPagina));
    const pagina = Math.min(this.paginaActual(), totalPaginas);
    const inicio = (pagina - 1) * this.itemsPorPagina;
    return this.filtradas().slice(inicio, inicio + this.itemsPorPagina);
  });

  ngOnInit(): void {
    this.cargar();
    this.pollingTimer = setInterval(() => this.refrescarSilencioso(), 5000);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      tareas: this.tareasService.obtenerTodas(),
      camiones: this.camionesService.obtenerTodos(),
      rutas: this.rutasService.getAll(),
      usuarios: this.usuariosService.getAll(),
    }).subscribe({
      next: ({ tareas, camiones, rutas, usuarios }) => {
        this.camiones.set(camiones);
        this.rutas.set(rutas);
        this.usuarios.set(usuarios);
        this.tareas.set(this.ordenar(tareas));
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          err.status === 0
            ? 'No se pudo conectar con el servidor.'
            : 'No se pudieron cargar las tareas.',
        );
      },
    });
  }

  private refrescarSilencioso(): void {
    if (this.cambiandoId() !== null) return;

    this.tareasService.obtenerTodas().subscribe({
      next: (tareas) => {
        this.tareas.set(this.ordenar(tareas));
      },
    });
  }

  cambiarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor as EstadoTarea | '');
    this.paginaActual.set(1);
  }

  etiquetaEstado(estado: EstadoTarea): string {
    return estado === 'EN_CURSO' ? 'En actividad' : etiquetaEstado(estado);
  }

  siguientes(t: Tarea): EstadoTarea[] {
    return siguientesDe(t.estado);
  }

  accion(estado: EstadoTarea): string {
    return accionEstado(estado);
  }

  async cambiarEstado(t: Tarea, nuevoEstado: EstadoTarea): Promise<void> {
    if (nuevoEstado === 'CANCELADO') {
      const confirmado = await this.alertService.confirmarAccion(
        `¿Cancelar la tarea TAR-${t.id}?`,
        `El camión ${this.patentePipe.transform(this.patente(t))} va a quedar disponible. Esta acción no se puede deshacer.`,
        'Sí, cancelar tarea',
      );
      if (!confirmado) return;
    }

    this.cambiandoId.set(t.id);
    this.tareasService.actualizarEstado(t.id, nuevoEstado).subscribe({
      next: (actualizada) => {
        this.tareas.update((lista) => lista.map((x) => (x.id === actualizada.id ? actualizada : x)));
        this.cambiandoId.set(null);
        this.alertService.toastExito(
          `Tarea TAR-${actualizada.id} ${this.etiquetaEstado(actualizada.estado).toLowerCase()}`,
        );
      },
      error: (err: HttpErrorResponse) => {
        this.cambiandoId.set(null);
        this.alertService.error(
          'No se pudo cambiar el estado',
          mensajeErrorTarea(err, 'cambiar el estado de la tarea'),
        );
      },
    });
  }

  patente(t: Tarea): string {
    return this.camionesPorId().get(t.idCamion)?.patente ?? '';
  }

  nombreRuta(t: Tarea): string {
    return this.rutasPorId().get(t.idRuta)?.nombre ?? `Ruta #${t.idRuta}`;
  }

  nombreChofer(t: Tarea): string {
    const chofer = this.usuariosPorId().get(t.idUsuario);
    return chofer ? `${chofer.nombre} ${chofer.apellido}` : `Chofer #${t.idUsuario}`;
  }

  abrirNuevo(): void {
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
  }

  alGuardar(tarea: Tarea): void {
    this.cerrarDrawer();
    this.tareas.update((lista) => this.ordenar([...lista, tarea]));
    this.alertService.toastExito('Tarea creada');
  }

  private ordenar(tareas: Tarea[]): Tarea[] {
    return [...tareas].sort(
      (a, b) => b.fechaEjecucion.localeCompare(a.fechaEjecucion) || b.id - a.id,
    );
  }
}