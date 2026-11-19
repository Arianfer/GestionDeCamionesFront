import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { CamionesService } from '../../camiones/camiones.service';
import { TareasService } from '../../tareas/tareas.service';
import { Camion } from '../../../shared/models/camion.model';
import { RutasService } from '../rutas.service';
import { Ruta } from '../../../shared/models/ruta.model';
import { Servicio } from '../../../shared/models/servicio.model';
import { Tarea } from '../../../shared/models/tarea.model';
import { PatentePipe } from '../../../shared/pipes/patente.pipe';
import { RutaForm } from '../ruta-form/ruta-form';
import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from '../../../shared/utils/mensaje-error';

/** Una asignación futura derivada de una tarea pendiente. */
interface UnidadRuta {
  idTarea: number | null;
  patente: string;
  modelo: string;
  fechaEjecucion: string;
}

@Component({
  selector: 'app-ruta-list',
  imports: [RouterLink, FormsModule, DatePipe, PatentePipe, RutaForm],
  templateUrl: './ruta-list.html',
  styleUrl: './ruta-list.css',
})
export class RutaList implements OnInit {
  private rutasService = inject(RutasService);
  private camionesService = inject(CamionesService);
  private tareasService = inject(TareasService);
  private alertService = inject(AlertService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private tareas = signal<Tarea[]>([]);
  private camiones = signal<Camion[]>([]);

  /**
   * El DTO de rutas no incluye la unidad asignada. La derivamos de las tareas
   * (que sí traen idRuta + idCamion) cruzadas con el catálogo de camiones.
   * Solo se muestran asignaciones vigentes: tareas PENDIENTES con fecha futura.
   */
  private readonly unidadesPorRuta = computed(() => {
    const porId = new Map(this.camiones().map((c) => [c.id, c]));
    const porRuta = new Map<number, UnidadRuta[]>();
    const ahora = Date.now();
    const ordenadas = [...this.tareas()]
      .filter(
        (tarea) =>
          tarea.estado === 'PENDIENTE' &&
          new Date(tarea.fechaEjecucion).getTime() > ahora,
      )
      .sort((a, b) => a.fechaEjecucion.localeCompare(b.fechaEjecucion));

    for (const tarea of ordenadas) {
      const camion = porId.get(tarea.idCamion);
      if (!camion) continue;

      const lista = porRuta.get(tarea.idRuta) ?? [];
      lista.push({
        idTarea: tarea.id,
        patente: camion.patente,
        modelo: '',
        fechaEjecucion: tarea.fechaEjecucion,
      });
      porRuta.set(tarea.idRuta, lista);
    }
    return porRuta;
  });

  rutas = signal<Ruta[]>([]);
  texto = signal('');
  fecha = signal(''); // 'YYYY-MM-DD' o vacío
  cargando = signal(true);
  error = signal('');

  seleccionadaId = signal<number | null>(null);
  drawerAbierto = signal(false);
  rutaEditandoId = signal<number | null>(null);

  rutasFiltradas = computed(() => {
    const t = this.texto().trim().toLowerCase();
    const f = this.fecha();

    return this.rutas().filter(
      (r) =>
        (!t ||
          r.nombre.toLowerCase().includes(t) ||
          (r.nombreChofer ?? '').toLowerCase().includes(t)) &&
        (!f || r.fecha === f),
    );
  });

  rutaSeleccionada = computed(() => {
    const lista = this.rutasFiltradas();
    const id = this.seleccionadaId();
    return lista.find((r) => r.idRuta === id) ?? lista[0] ?? null;
  });

  ngOnInit() {
    this.cargar();

    const params = this.route.snapshot.queryParamMap;
    const idEditar = Number(params.get('editar'));

    if (params.get('nueva') === '1') {
      this.abrirNueva();
      this.router.navigate(['/rutas'], { replaceUrl: true });
    } else if (Number.isInteger(idEditar) && idEditar > 0) {
      this.seleccionadaId.set(idEditar);
      this.rutaEditandoId.set(idEditar);
      this.drawerAbierto.set(true);
      this.router.navigate(['/rutas'], { replaceUrl: true });
    }
  }

  cantidadServicios(r: Ruta): number {
    return (r.servicios ?? []).length;
  }

  serviciosOrdenados(r: Ruta): Servicio[] {
    return [...(r.servicios ?? [])].sort((a, b) => a.orden - b.orden);
  }

  resumenTrayecto(r: Ruta): string {
    const servicios = this.serviciosOrdenados(r);
    if (servicios.length === 0) return 'Sin paradas asignadas';
    if (servicios.length === 1) return servicios[0].nombre;
    return `${servicios[0].nombre} → ${servicios[servicios.length - 1].nombre}`;
  }

  /** Unidades pendientes y futuras de la ruta, con fallback al DTO. */
  unidadesDeRuta(r: Ruta): UnidadRuta[] {
    const derivadas = this.unidadesPorRuta().get(r.idRuta) ?? [];
    if (derivadas.length > 0) return derivadas;

    const patente = (r.patenteCamion ?? '').trim();
    const modelo = (r.modeloCamion ?? '').trim();
    if (!patente && !modelo) return [];

    return [{ idTarea: null, patente, modelo, fechaEjecucion: '' }];
  }

  /** Enriquecimiento optativo: si falla, la lista sigue funcionando igual que antes. */
  private cargarUnidades(): void {
    forkJoin({
      tareas: this.tareasService.obtenerTodas().pipe(catchError(() => of([] as Tarea[]))),
      camiones: this.camionesService.obtenerTodos().pipe(catchError(() => of([] as Camion[]))),
    }).subscribe(({ tareas, camiones }) => {
      this.tareas.set(tareas);
      this.camiones.set(camiones);
    });
  }

  cargar(idSeleccionar?: number | null) {
    this.cargando.set(true);
    this.error.set('');
    this.cargarUnidades();
    this.rutasService.getAll().subscribe({
      next: (data) => {
        const ordenadas = [...data].sort(
          (a, b) =>
            (b.fecha ?? '').localeCompare(a.fecha ?? '') ||
            a.nombre.localeCompare(b.nombre),
        );
        this.rutas.set(ordenadas);

        const id = idSeleccionar ?? this.seleccionadaId();
        const existe = id !== null && ordenadas.some((r) => r.idRuta === id);
        this.seleccionadaId.set(existe ? id : (ordenadas[0]?.idRuta ?? null));

        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'cargar las rutas'));
        this.cargando.set(false);
      },
    });
  }

  seleccionar(r: Ruta) {
    this.seleccionadaId.set(r.idRuta);
  }

  esSeleccionada(r: Ruta): boolean {
    return this.rutaSeleccionada()?.idRuta === r.idRuta;
  }

  abrirNueva() {
    this.rutaEditandoId.set(null);
    this.drawerAbierto.set(true);
  }

  abrirEditar(r: Ruta) {
    this.rutaEditandoId.set(r.idRuta);
    this.drawerAbierto.set(true);
  }

  cerrarDrawer() {
    this.drawerAbierto.set(false);
  }

  alGuardar(r: Ruta) {
    this.drawerAbierto.set(false);
    this.seleccionadaId.set(r.idRuta);
    this.cargar(r.idRuta);
  }

  alReordenar(servicios: Servicio[]) {
    const id = this.rutaEditandoId();
    if (id === null) return;

    this.rutas.update((rutas) =>
      rutas.map((r) => (r.idRuta === id ? { ...r, servicios } : r)),
    );
  }

  async eliminar(r: Ruta): Promise<void> {
    const n = this.cantidadServicios(r);
    const aviso =
      n > 0
        ? `Se van a eliminar también sus ${n} servicios. Esta acción no se puede deshacer.`
        : undefined;

    const ok = await this.alertService.confirmarEliminacion(`la ruta "${r.nombre}"`, aviso);
    if (!ok) return;

    this.rutasService.eliminar(r.idRuta).subscribe({
      next: () => {
        this.rutas.update((lista) => lista.filter((x) => x.idRuta !== r.idRuta));
        if (this.seleccionadaId() === r.idRuta) {
          const lista = this.rutasFiltradas();
          this.seleccionadaId.set(lista[0]?.idRuta ?? null);
        }
      },
      error: (err: HttpErrorResponse) =>
        this.error.set(
          err.status === 500
            ? 'No se pudo eliminar. Puede que la ruta tenga servicios o tareas asignadas.'
            : mensajeError(err, 'eliminar la ruta'),
        ),
    });
  }
}
