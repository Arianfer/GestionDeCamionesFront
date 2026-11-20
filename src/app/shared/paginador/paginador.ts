import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-paginador',
  standalone: true,
  template: `
    @if (totalPaginas() > 1) {
      <nav class="paginador" aria-label="Paginación">
        <span class="paginador-info">
          Mostrando <strong>{{ desde() }}–{{ hasta() }}</strong> de <strong>{{ totalItems() }}</strong>
        </span>

        <div class="paginador-controles">
          <button
            type="button"
            class="pag-btn"
            [disabled]="paginaActual() <= 1"
            (click)="cambiarPagina.emit(paginaActual() - 1)"
            aria-label="Página anterior"
          >
            ← Anterior
          </button>

          <div class="pag-numeros">
            @for (item of paginasVisibles(); track $index) {
              @if (item === '...') {
                <span class="pag-puntos">…</span>
              } @else {
                <button
                  type="button"
                  class="pag-num"
                  [class.activa]="item === paginaActual()"
                  (click)="cambiarPagina.emit(+item)"
                >
                  {{ item }}
                </button>
              }
            }
          </div>

          <button
            type="button"
            class="pag-btn"
            [disabled]="paginaActual() >= totalPaginas()"
            (click)="cambiarPagina.emit(paginaActual() + 1)"
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>
      </nav>
    }
  `,
  styles: [`
    .paginador {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
      padding: 14px 18px;
      background: var(--color-superficie, #ffffff);
      border: 1px solid var(--color-borde, #e2e8f0);
      border-radius: 16px;
      font-size: 13px;
    }

    .paginador-info {
      color: var(--color-texto, #334155);
      opacity: 0.75;
    }

    .paginador-controles {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pag-numeros {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pag-btn,
    .pag-num {
      padding: 7px 12px;
      border: 1px solid var(--color-borde, #e2e8f0);
      border-radius: 10px;
      background: var(--color-superficie, #ffffff);
      color: var(--color-texto, #0f172a);
      font: inherit;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    .pag-num {
      min-width: 34px;
      padding: 7px 8px;
      text-align: center;
    }

    .pag-btn:hover:not(:disabled),
    .pag-num:hover:not(.activa) {
      background: var(--color-fondo, #f8fafc);
      border-color: var(--color-primario, #16a34a);
    }

    .pag-num.activa {
      background: var(--color-primario, #16a34a);
      border-color: var(--color-primario, #16a34a);
      color: var(--color-texto-claro, #ffffff);
      font-weight: 700;
    }

    .pag-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .pag-puntos {
      padding: 0 4px;
      opacity: 0.5;
    }

    @media (max-width: 640px) {
      .paginador {
        justify-content: center;
      }
    }
  `]
})
export class PaginadorComponent {
  readonly totalItems = input.required<number>();
  readonly paginaActual = input.required<number>();
  readonly itemsPorPagina = input<number>(9);
  readonly cambiarPagina = output<number>();

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.itemsPorPagina()))
  );

  readonly desde = computed(() =>
    this.totalItems() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina() + 1
  );

  readonly hasta = computed(() =>
    Math.min(this.paginaActual() * this.itemsPorPagina(), this.totalItems())
  );

  readonly paginasVisibles = computed<(number | '...')[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (actual <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (actual >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', actual - 1, actual, actual + 1, '...', total];
  });
}