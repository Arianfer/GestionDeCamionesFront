import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AlertService } from '../../../core/services/alert.service';
import { Cliente } from '../../../shared/models/cliente.model';
import { CuitPipe } from '../../../shared/pipes/cuit.pipe';
import { ClienteForm } from '../cliente-form/cliente-form';
import { ClienteService } from '../cliente.service';
import { mensajeError } from '../../../shared/utils/mensaje-error';

@Component({
  selector: 'app-cliente-list',
  imports: [CuitPipe, ClienteForm],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.css',
})
export class ClienteList implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  readonly clientes = signal<Cliente[]>([]);
  readonly filtro = signal('');
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly eliminandoId = signal<number | null>(null);
  readonly drawerAbierto = signal(false);
  readonly clienteEditandoId = signal<number | null>(null);

  readonly filtrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    if (!q) return this.clientes();

    const qDigitos = q.replace(/\D/g, '');
    return this.clientes().filter(
      (c) =>
        String(c.id) === q ||
        `cli-${c.id}` === q ||
        c.razonSocial.toLowerCase().includes(q) ||
        (qDigitos.length > 0 && c.cuit.replace(/\D/g, '').includes(qDigitos)),
    );
  });

  ngOnInit(): void {
    this.cargarClientes();

    const params = this.route.snapshot.queryParamMap;
    const idEditar = Number(params.get('editar'));

    if (params.get('nuevo') === '1') {
      this.abrirNuevo();
      this.router.navigate(['/clientes'], { replaceUrl: true });
    } else if (Number.isInteger(idEditar) && idEditar > 0) {
      this.clienteEditandoId.set(idEditar);
      this.drawerAbierto.set(true);
      this.router.navigate(['/clientes'], { replaceUrl: true });
    }
  }

  cargarClientes(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.clienteService.obtenerClientes().subscribe({
      next: (clientes) => {
        this.clientes.set(this.ordenar(clientes));
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err, 'cargar los clientes'));
      },
    });
  }

  abrirNuevo(): void {
    this.clienteEditandoId.set(null);
    this.drawerAbierto.set(true);
  }

  abrirEditar(cliente: Cliente): void {
    this.clienteEditandoId.set(cliente.id);
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.clienteEditandoId.set(null);
  }

  alGuardar(cliente: Cliente): void {
    const existe = this.clientes().some((c) => c.id === cliente.id);
    this.cerrarDrawer();
    this.clientes.update((lista) => {
      const actualizada = existe
        ? lista.map((c) => (c.id === cliente.id ? cliente : c))
        : [...lista, cliente];
      return this.ordenar(actualizada);
    });
    this.alertService.toastExito(existe ? 'Cliente actualizado' : 'Cliente creado');
  }

  async eliminarCliente(cliente: Cliente): Promise<void> {
    const confirmado = await this.alertService.confirmarEliminacion(
      `al cliente "${cliente.razonSocial}"`,
    );
    if (!confirmado) return;

    this.error.set(null);
    this.eliminandoId.set(cliente.id);
    this.clienteService.eliminar(cliente.id).subscribe({
      next: () => {
        this.clientes.update((lista) => lista.filter((c) => c.id !== cliente.id));
        if (this.clienteEditandoId() === cliente.id) this.cerrarDrawer();
        this.eliminandoId.set(null);
        this.alertService.toastExito('Cliente eliminado');
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoId.set(null);
        // El back devuelve 500 si el cliente tiene servicios asociados (clave foránea).
        const msg =
          err.status === 500
            ? 'No se pudo eliminar el cliente. Probablemente tenga servicios asociados.'
            : mensajeError(err, 'eliminar el cliente');
        this.error.set(msg);
        this.alertService.error('No se pudo eliminar', msg);
      },
    });
  }

  private ordenar(clientes: Cliente[]): Cliente[] {
    return [...clientes].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es'));
  }
}