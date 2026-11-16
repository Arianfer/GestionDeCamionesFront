import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Cliente } from '../../../shared/models/cliente.model';
import { Ruta } from '../../../shared/models/ruta.model';
import { Servicio } from '../../../shared/models/servicio.model';
import { AlertService } from '../../../core/services/alert.service';
import { ClienteService } from '../../clientes/cliente.service';
import { RutasService } from '../../rutas/rutas.service';
import { mensajeError } from '../mensaje-error';
import {
  ETIQUETAS_FRECUENCIA,
  ETIQUETAS_PRIORIDAD,
  ETIQUETAS_RESIDUO,
} from '../servicio-etiquetas';
import { ServicioDetalle } from '../servicio-detalle/servicio-detalle';
import { ServicioForm } from '../servicio-form/servicio-form';
import { ServiciosService } from '../servicios.service';

@Component({
  selector: 'app-servicio-list',
  imports: [ServicioDetalle, ServicioForm],
  templateUrl: './servicio-list.html',
  styleUrl: './servicio-list.css',
})
export class ServicioList implements OnInit {
  private readonly serviciosService = inject(ServiciosService);
  private readonly clienteService = inject(ClienteService);
  private readonly rutasService = inject(RutasService);
  private readonly alertService = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly servicios = signal<Servicio[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly rutas = signal<Ruta[]>([]);

  readonly filtro = signal('');
  readonly filtroRuta = signal<number | null>(null);
  readonly seleccionadaId = signal<number | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly eliminandoId = signal<number | null>(null);

  readonly drawerAbierto = signal(false);
  readonly servicioEditandoId = signal<number | null>(null);

  readonly etiquetasPrioridad = ETIQUETAS_PRIORIDAD;
  readonly etiquetasResiduo = ETIQUETAS_RESIDUO;
  readonly etiquetasFrecuencia = ETIQUETAS_FRECUENCIA;

  private readonly nombreCliente = computed(
    () => new Map(this.clientes().map((c) => [c.id, c.razonSocial])),
  );
  private readonly nombreRuta = computed(
    () => new Map(this.rutas().map((r) => [r.idRuta, r.nombre])),
  );

  readonly serviciosFiltrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const idRuta = this.filtroRuta();
    const clientes = this.nombreCliente();
    const rutas = this.nombreRuta();

    return this.servicios()
      .filter((s) => {
        if (idRuta !== null && s.idRuta !== idRuta) return false;
        if (!q) return true;

        const cliente = clientes.get(s.idCliente) ?? '';
        const ruta = rutas.get(s.idRuta) ?? '';

        return (
          String(s.id) === q ||
          `srv-${s.id}` === q ||
          s.nombre.toLowerCase().includes(q) ||
          s.direccion.toLowerCase().includes(q) ||
          s.prioridad.toLowerCase().includes(q) ||
          s.tipoResiduo.toLowerCase().includes(q) ||
          s.frecuencia.toLowerCase().includes(q) ||
          ETIQUETAS_PRIORIDAD[s.prioridad].toLowerCase().includes(q) ||
          ETIQUETAS_RESIDUO[s.tipoResiduo].toLowerCase().includes(q) ||
          ETIQUETAS_FRECUENCIA[s.frecuencia].toLowerCase().includes(q) ||
          cliente.toLowerCase().includes(q) ||
          ruta.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.idRuta - b.idRuta || a.orden - b.orden);
  });

  readonly servicioSeleccionado = computed(() => {
    const lista = this.serviciosFiltrados();
    const id = this.seleccionadaId();
    return lista.find((s) => s.id === id) ?? lista[0] ?? null;
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const nuevo = params.get('nuevo') === '1';
    const idEditar = this.numeroValido(params.get('editar'));

    if (idEditar !== null) {
      this.seleccionadaId.set(idEditar);
    }

    this.cargar(this.seleccionadaId());

    if (nuevo) {
      this.abrirNuevo();
    } else if (idEditar !== null) {
      this.abrirEditarId(idEditar);
    }

    if (nuevo || idEditar !== null) {
      this.router.navigate(['/servicios'], { replaceUrl: true });
    }
  }

  cargar(idSeleccionar?: number | null): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      servicios: this.serviciosService.getAll(),
      clientes: this.clienteService.obtenerClientes(),
      rutas: this.rutasService.getAll(),
    }).subscribe({
      next: ({ servicios, clientes, rutas }) => {
        const ordenados = [...servicios].sort(
          (a, b) => a.idRuta - b.idRuta || a.orden - b.orden,
        );

        this.servicios.set(ordenados);
        this.clientes.set(clientes);
        this.rutas.set(rutas);

        const id = idSeleccionar ?? this.seleccionadaId();
        const existe = id !== null && ordenados.some((s) => s.id === id);
        this.seleccionadaId.set(existe ? id : (ordenados[0]?.id ?? null));
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'cargar los servicios'));
        this.cargando.set(false);
      },
    });
  }

  clienteDe(s: Servicio): string {
    return this.nombreCliente().get(s.idCliente) ?? `Cliente #${s.idCliente}`;
  }

  rutaDe(s: Servicio): string {
    return this.nombreRuta().get(s.idRuta) ?? `Ruta #${s.idRuta}`;
  }

  seleccionar(s: Servicio): void {
    this.seleccionadaId.set(s.id);
  }

  esSeleccionado(s: Servicio): boolean {
    return this.servicioSeleccionado()?.id === s.id;
  }

  cambiarFiltroRuta(valor: string): void {
    this.filtroRuta.set(valor === '' ? null : Number(valor));
  }

  limpiarFiltros(): void {
    this.filtro.set('');
    this.filtroRuta.set(null);
  }

  abrirNuevo(): void {
    this.servicioEditandoId.set(null);
    this.drawerAbierto.set(true);
  }

  abrirEditar(servicio: Servicio): void {
    this.abrirEditarId(servicio.id);
  }

  abrirEditarId(id: number): void {
    this.seleccionadaId.set(id);
    this.servicioEditandoId.set(id);
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.servicioEditandoId.set(null);
  }

  alGuardar(servicio: Servicio): void {
    const existia = this.servicios().some((s) => s.id === servicio.id);

    this.servicios.update((lista) => {
      const actualizada = existia
        ? lista.map((s) => (s.id === servicio.id ? servicio : s))
        : [...lista, servicio];
      return [...actualizada].sort((a, b) => a.idRuta - b.idRuta || a.orden - b.orden);
    });

    this.seleccionadaId.set(servicio.id);
    this.cerrarDrawer();
    this.alertService.toastExito(
      existia ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente',
    );
  }

  async eliminar(s: Servicio): Promise<void> {
    const ok = await this.alertService.confirmarEliminacion(
      `el servicio "${s.nombre}"`,
      `Ubicación: ${s.direccion}. Esta acción no se puede deshacer.`,
    );
    if (!ok) return;

    this.error.set('');
    this.eliminandoId.set(s.id);

    this.serviciosService.eliminar(s.id).subscribe({
      next: () => {
        this.servicios.update((lista) => lista.filter((x) => x.id !== s.id));
        if (this.seleccionadaId() === s.id) {
          this.seleccionadaId.set(this.serviciosFiltrados()[0]?.id ?? null);
        }
        this.eliminandoId.set(null);
        this.alertService.toastExito(`Servicio "${s.nombre}" eliminado`);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoId.set(null);
        this.error.set(mensajeError(err, `eliminar el servicio "${s.nombre}"`));
      },
    });
  }

  private numeroValido(valor: string | null): number | null {
    if (!valor) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
}
