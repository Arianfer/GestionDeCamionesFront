import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RutasService } from '../rutas.service';
import { Ruta } from '../../../shared/models/ruta.model';

@Component({
  selector: 'app-ruta-list',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './ruta-list.html',
  styleUrl: './ruta-list.css',
})
export class RutaList implements OnInit {
  private rutasService = inject(RutasService);

  rutas = signal<Ruta[]>([]);
  texto = signal('');
  fecha = signal(''); // 'YYYY-MM-DD' o vacío
  cargando = signal(true);
  error = signal('');

  rutasFiltradas = computed(() => {
    const t = this.texto().trim().toLowerCase();
    const f = this.fecha();

    return this.rutas()
      .filter(
        (r) =>
          !t ||
          r.nombre.toLowerCase().includes(t) ||
          (r.nombreChofer ?? '').toLowerCase().includes(t),
      )
      .filter((r) => !f || r.fecha === f)
      // las más recientes primero
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre));
  });

  ngOnInit() {
    this.cargar();
  }

  cantidadServicios(r: Ruta): number {
    return (r.servicios ?? []).length;
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.rutasService.getAll().subscribe({
      next: (data) => {
        this.rutas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las rutas.');
        this.cargando.set(false);
      },
    });
  }

  eliminar(r: Ruta) {
    const n = this.cantidadServicios(r);
    const aviso = n > 0 ? `\n\nSe van a eliminar también sus ${n} servicios.` : '';

    // Provisorio hasta tener shared/confirm-dialog
    if (!confirm(`¿Eliminar la ruta "${r.nombre}"?${aviso}`)) return;

    this.rutasService.eliminar(r.idRuta).subscribe({
      next: () => this.rutas.update((lista) => lista.filter((x) => x.idRuta !== r.idRuta)),
      error: () =>
        this.error.set(
          'No se pudo eliminar. Puede que la ruta tenga tareas asignadas.',
        ),
    });
  }
}