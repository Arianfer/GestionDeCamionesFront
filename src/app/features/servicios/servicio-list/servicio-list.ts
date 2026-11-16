// src/app/features/servicios/servicio-list/servicio-list.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ServiciosService } from '../servicios.service';
import { ClienteService } from '../../clientes/cliente.service';
import { RutasService } from '../../rutas/rutas.service';
import { mensajeError } from '../mensaje-error';
import { Servicio } from '../../../shared/models/servicio.model';
import { Cliente } from '../../../shared/models/cliente.model';
import { Ruta } from '../../../shared/models/ruta.model';

@Component({
  selector: 'app-servicio-list',
  imports: [RouterLink],
  templateUrl: './servicio-list.html',
  styleUrl: './servicio-list.css',
})
export class ServicioList implements OnInit {
  private serviciosService = inject(ServiciosService);
  private clienteService = inject(ClienteService);
  private rutasService = inject(RutasService);

  servicios = signal<Servicio[]>([]);
  clientes = signal<Cliente[]>([]);
  rutas = signal<Ruta[]>([]);
  filtroRuta = signal<number | null>(null);
  cargando = signal(true);
  error = signal('');
  eliminandoId = signal<number | null>(null);

  // Diccionarios id -> nombre, para no recorrer el array en cada fila
  private nombreCliente = computed(
    () => new Map(this.clientes().map((c) => [c.id, c.razonSocial])),
  );
  private nombreRuta = computed(
    () => new Map(this.rutas().map((r) => [r.idRuta, r.nombre])),
  );

  // Lo que se muestra: filtrado por ruta y ordenado por ruta y orden de visita
  serviciosFiltrados = computed(() => {
    const idRuta = this.filtroRuta();
    const lista =
      idRuta === null ? this.servicios() : this.servicios().filter((s) => s.idRuta === idRuta);
    return [...lista].sort((a, b) => a.idRuta - b.idRuta || a.orden - b.orden);
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      servicios: this.serviciosService.getAll(),
      clientes: this.clienteService.obtenerClientes(),
      rutas: this.rutasService.getAll(),
    }).subscribe({
      next: ({ servicios, clientes, rutas }) => {
        this.servicios.set(servicios);
        this.clientes.set(clientes);
        this.rutas.set(rutas);
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

  cambiarFiltro(valor: string) {
    this.filtroRuta.set(valor === '' ? null : Number(valor));
  }

  eliminar(s: Servicio) {
    // Provisorio, igual que en clientes/rutas/usuarios, hasta tener un confirm-dialog en shared/
    const ok = confirm(
      `¿Eliminar el servicio "${s.nombre}" (${s.direccion})?\nEsta acción no se puede deshacer.`,
    );
    if (!ok) return;

    this.error.set('');
    this.eliminandoId.set(s.id);

    this.serviciosService.eliminar(s.id).subscribe({
      next: () => {
        // Lo saco de la lista local en vez de volver a pedir todo al back
        this.servicios.update((lista) => lista.filter((x) => x.id !== s.id));
        this.eliminandoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoId.set(null);
        this.error.set(mensajeError(err, `eliminar el servicio "${s.nombre}"`));
      },
    });
  }
}