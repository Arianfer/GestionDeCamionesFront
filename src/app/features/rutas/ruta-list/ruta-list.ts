import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RutasService } from '../rutas.service';
import { Ruta } from '../../../shared/models/ruta.model';
import { Servicio } from '../../../shared/models/servicio.model';
import { RutaForm } from '../ruta-form/ruta-form';
import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from '../../../shared/utils/mensaje-error';

@Component({
  selector: 'app-ruta-list',
  imports: [RouterLink, FormsModule, DatePipe, RutaForm],
  templateUrl: './ruta-list.html',
  styleUrl: './ruta-list.css',
})
export class RutaList implements OnInit {
  private rutasService = inject(RutasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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

    if (this.route.snapshot.queryParamMap.get('nueva') === '1') {
      this.abrirNueva();
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

  unidadAsignada(r: Ruta): string {
    const patente = (r.patenteCamion ?? '').trim();
    const modelo = (r.modeloCamion ?? '').trim();
    if (!patente && !modelo) return 'Sin unidad asignada';
    return [patente, modelo].filter(Boolean).join(' · ');
  }

  cargar(idSeleccionar?: number | null) {
    this.cargando.set(true);
    this.error.set('');
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

  eliminar(r: Ruta) {
    const n = this.cantidadServicios(r);
    const aviso = n > 0 ? `\n\nSe van a eliminar también sus ${n} servicios.` : '';

    // Provisorio hasta tener shared/confirm-dialog
    if (!confirm(`¿Eliminar la ruta "${r.nombre}"?${aviso}`)) return;

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
