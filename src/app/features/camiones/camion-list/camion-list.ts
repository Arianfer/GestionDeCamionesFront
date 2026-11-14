import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { Camion, EstadoCamion, TipoCamion } from '../../../shared/models/camion.model';
import { PatentePipe } from '../../../shared/pipes/patente.pipe';
import { CamionesService } from '../camiones.service';

@Component({
  selector: 'app-camion-list',
  imports: [PatentePipe],
  templateUrl: './camion-list.html',
  styleUrl: './camion-list.css',
})
export class CamionList implements OnInit {
  private readonly camionesService = inject(CamionesService);

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
  readonly error = signal<string | null>(null);

  /** Filtra por estado y por texto: ID exacto o patente (sin importar espacios ni mayúsculas). */
  readonly filtrados = computed(() => {
    const q = this.filtro().trim().toUpperCase().replace(/\s/g, '');
    const estado = this.estadoFiltro();

    return this.camiones().filter((c) => {
      if (estado && c.estadoCamion !== estado) return false;
      if (!q) return true;
      return String(c.id) === q || c.patente.toUpperCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.camionesService.obtenerTodos().subscribe({
      next: (camiones) => {
        this.camiones.set(camiones);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          err.status === 0
            ? 'No se pudo conectar con el servidor.'
            : 'No se pudieron cargar los camiones.',
        );
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
}