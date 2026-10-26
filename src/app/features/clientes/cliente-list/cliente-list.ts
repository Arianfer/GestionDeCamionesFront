import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Cliente } from '../../../shared/models/cliente.model';
import { CuitPipe } from '../../../shared/pipes/cuit.pipe';
import { ClienteService } from '../cliente.service';

@Component({
  selector: 'app-cliente-list',
  imports: [RouterLink, CuitPipe],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.css',
})
export class ClienteList implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly clientes = signal<Cliente[]>([]);
  private readonly filtro = signal('');
  private readonly cargando = signal(true);
  private readonly error = signal<string | null>(null);
  private readonly eliminandoId = signal<number | null>(null);

  /** Filtra por ID exacto, CUIT (con o sin guiones) o razón social. */
  private readonly filtrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    if (!q) return this.clientes();
    const qDigitos = q.replace(/\D/g, '');
    return this.clientes().filter(
      (c) =>
        String(c.id) === q ||
        c.razonSocial.toLowerCase().includes(q) ||
        (qDigitos.length > 0 && c.cuit.includes(qDigitos)),
    );
  });

  ngOnInit(): void {
    this.cargarCliente();
  }

  cargarCliente(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.clienteService.obtenerClientes().subscribe({
      next: (clientes) => {
        this.clientes.set(clientes);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          err.status === 0
            ? 'No se pudo conectar con el servidor.'
            : 'No se pudieron cargar los clientes.',
        );
      },
    });
  }

  eliminarCliente(cliente: Cliente): void {
    // TODO: reemplazar por el confirm-dialog de shared/ cuando exista.
    if (!confirm(`¿Eliminar al cliente "${cliente.razonSocial}"?`)) return;

    this.error.set(null);
    this.eliminandoId.set(cliente.id);
    this.clienteService.eliminar(cliente.id).subscribe({
      next: () => {
        this.clientes.update((lista) => lista.filter((c) => c.id !== cliente.id));
        this.eliminandoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.eliminandoId.set(null);
        // El back devuelve 500 si el cliente tiene servicios asociados (clave foránea).
        this.error.set(
          err.status === 500
            ? 'No se pudo eliminar el cliente. Probablemente tenga servicios asociados.'
            : 'No se pudo eliminar el cliente.',
        );
      },
    });
  }
}
