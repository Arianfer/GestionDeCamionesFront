import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AlertService } from '../../../core/services/alert.service';
import { Camion } from '../../../shared/models/camion.model';
import { Ruta } from '../../../shared/models/ruta.model';
import { EstadoTarea, Tarea } from '../../../shared/models/tarea.model';
import { Usuario } from '../../../shared/models/usuario.model';
import { PatentePipe } from '../../../shared/pipes/patente.pipe';
import { CamionesService } from '../../camiones/camiones.service';
import { RutasService } from '../../rutas/rutas.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { TareaForm } from '../tarea-form/tarea-form';
import { ESTADOS_TAREA, etiquetaEstado } from '../tarea-estados';
import { TareasService } from '../tareas.service';

@Component({
  selector: 'app-tarea-list',
  imports: [DatePipe, PatentePipe, TareaForm],
  templateUrl: './tarea-list.html',
  styleUrl: './tarea-list.css',
})
export class TareaList implements OnInit {
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

  // La tarea solo trae ids. Estos mapas permiten buscar el camión, la ruta o el
  // chofer por id sin recorrer la lista entera cada vez (se recalculan solos
  // cuando cambia el signal del que dependen).
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

  ngOnInit(): void {
    this.cargar();
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

  cambiarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor as EstadoTarea | '');
  }

  etiquetaEstado(estado: EstadoTarea): string {
    return etiquetaEstado(estado);
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
