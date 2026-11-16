// usuario-list.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../shared/models/usuario.model';

@Component({
  selector: 'app-usuario-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './usuario-list.html',
  styleUrl: './usuario-list.css',
})
export class UsuarioList implements OnInit {
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);

  usuarios = signal<Usuario[]>([]);
  dni = signal('');
  cargando = signal(true);
  error = signal('');
  aviso = signal('');

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.aviso.set('');
    // El backend ya filtra: OFICINA solo recibe usuarios EMPLEADO
    this.usuariosService.getAll().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.cargando.set(false);
      },
    });
  }

  buscarPorDni() {
    const valor = this.dni().trim();
    this.error.set('');
    this.aviso.set('');

    if (!valor) {
      this.cargar();
      return;
    }
    if (!/^\d{7,8}$/.test(valor)) {
      this.aviso.set('El DNI debe tener 7 u 8 números.');
      return;
    }

    this.usuariosService.getByDni(valor).subscribe({
      next: (u) => this.usuarios.set([u]),
      error: () => {
        this.usuarios.set([]);
        this.aviso.set('No se encontró un usuario con ese DNI, o no tenés permiso para verlo.');
      },
    });
  }

  limpiar() {
    this.dni.set('');
    this.cargar();
  }

  // No se muestra "Desactivar" sobre la propia cuenta
  esPropio(u: Usuario): boolean {
    return String(u.id) === this.auth.getId();
  }

  desactivar(u: Usuario) {
    // Provisorio hasta tener shared/confirm-dialog
    if (!confirm(`¿Desactivar a ${u.nombre} ${u.apellido}? No va a poder iniciar sesión.`)) return;

    this.usuariosService.desactivar(u.id).subscribe({
      next: () =>
        this.usuarios.update((lista) =>
          lista.map((x) => (x.id === u.id ? { ...x, activo: false } : x)),
        ),
      error: () => this.error.set('No se pudo desactivar el usuario.'),
    });
  }
}