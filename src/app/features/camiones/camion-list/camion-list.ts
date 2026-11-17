import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Camion, EstadoCamion, TipoCamion } from '../../../shared/models/camion.model';
import { PatentePipe } from '../../../shared/pipes/patente.pipe';
import { CamionForm } from '../camion-form/camion-form';
import { CamionesService } from '../camiones.service';
import { mensajeError } from '../../../shared/utils/mensaje-error';

@Component({
  selector: 'app-camion-list',
  imports: [PatentePipe, CamionForm],
  templateUrl: './camion-list.html',
  styleUrl: './camion-list.css',
})
export class CamionList implements OnInit {
  private readonly camionesService = inject(CamionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly estados: { valor: EstadoCamion; etiqueta: string }[] = [
    { valor: 'DISPONIBLE', etiqueta: 'Disponible' },
    { valor: 'EN_RUTA', etiqueta: 'En ruta' },
    { valor: 'EN_MANTENIMIENTO', etiqueta: 'En mantenimiento' },
  ];

  private readonly etiquetasTipo: Record<TipoCamion, string> = {
    RECOLECTOR: 'Recolector',
    BARRIOS_PRIVADOS: 'Barrios privados',
    DAILY: 'Daily',
  };

  readonly camiones = signal<Camion[]>([]);
  readonly filtro = signal('');
  readonly estadoFiltro = signal<EstadoCamion | ''>('');
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly eliminandoId = signal<number | null>(null);
  readonly drawerAbierto = signal(false);
  readonly camionEditandoId = signal<number | null>(null);

  readonly filtrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const qPatente = q.replace(/\s/g, '').toUpperCase();
    const estado = this.estadoFiltro();

    return this.camiones().filter((c) => {
      if (estado && c.estadoCamion !== estado) return false;
      if (!q) return true;

      return (
        String(c.id) === q ||
        `cam-${c.id}` === q ||
        c.patente.toUpperCase().includes(qPatente) ||
        this.etiquetaTipo(c.tipo).toLowerCase().includes(q) ||
        this.etiquetaEstado(c.estadoCamion).toLowerCase().includes(q)
      );
    });
  });

  ngOnInit(): void {
    this.cargar();

    const params = this.route.snapshot.queryParamMap;
    const idEditar = Number(params.get('editar'));

    if (params.get('nuevo') === '1') {
      this.abrirNuevo();
      this.router.navigate(['/camiones'], { replaceUrl: true });
    } else if (Number.isInteger(idEditar) && idEditar > 0) {
      this.camionEditandoId.set(idEditar);
      this.drawerAbierto.set(true);
      this.router.navigate(['/camiones'], { replaceUrl: true });
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.camionesService.obtenerTodos().subscribe({
      next: (camiones) => {
        this.camiones.set(this.ordenar(camiones));
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err, 'cargar los camiones'));
      },
    });
  }

  cambiarEstadoFiltro(valor: string): void {
    this.estadoFiltro.set(valor as EstadoCamion | '');
  }

  etiquetaEstado(estado: EstadoCamion): string {
    return this.estados.find((e) => e.valor === estado)?.etiqueta ?? estado;
  }

  etiquetaTipo(tipo: TipoCamion): string {
    return this.etiquetasTipo[tipo] ?? tipo;
  }

  abrirNuevo(): void {
    this.camionEditandoId.set(null);
    this.drawerAbierto.set(true);
  }

  abrirEditar(camion: Camion): void {
    this.camionEditandoId.set(camion.id);
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.camionEditandoId.set(null);
  }

  alGuardar(camion: Camion): void {
    this.cerrarDrawer();
    this.camiones.update((lista) => {
      const existe = lista.some((c) => c.id === camion.id);
      const actualizada = existe
        ? lista.map((c) => (c.id === camion.id ? camion : c))
        : [...lista, camion];
      return this.ordenar(actualizada);
    });
  }

  eliminar(camion: Camion): void {
    if (!confirm(`¿Eliminar el camión ${camion.patente}?`)) return;

    this.eliminandoId.set(camion.id);
    this.camionesService.eliminar(camion.id).subscribe({
      next: () => {
        this.camiones.update((lista) => lista.filter((c) => c.id !== camion.id));
        if (this.camionEditandoId() === camion.id) this.cerrarDrawer();
        this.eliminandoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoId.set(null);
        this.error.set(
          err.status === 500
            ? 'No se pudo eliminar. Puede que el camión tenga rutas asociadas.'
            : mensajeError(err, 'eliminar el camión'),
        );
      },
    });
  }

  private ordenar(camiones: Camion[]): Camion[] {
    return [...camiones].sort((a, b) => a.patente.localeCompare(b.patente, 'es'));
  }
}
