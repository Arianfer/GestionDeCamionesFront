import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../shared/models/usuario.model';
import { UsuarioForm } from '../usuario-form/usuario-form';
import { UsuariosService } from '../usuarios.service';
import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from '../../../shared/utils/mensaje-error';

@Component({
  selector: 'app-usuario-list',
  imports: [UsuarioForm],
  templateUrl: './usuario-list.html',
  styleUrl: './usuario-list.css',
})
export class UsuarioList implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly usuarios = signal<Usuario[]>([]);
  readonly filtro = signal('');
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly drawerAbierto = signal(false);
  readonly usuarioEditandoId = signal<number | null>(null);

  private idEditarPendiente: number | null = null;

  readonly filtrados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const visibles = this.usuarios().filter((u) =>
      this.auth.puedeGestionarUsuario(u.rol),
    );
    if (!q) return visibles;

    return visibles.filter(
      (u) =>
        `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
        u.dni.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q) ||
        this.etiquetaRol(u.rol).toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.cargar();

    const params = this.route.snapshot.queryParamMap;
    const idEditar = Number(params.get('editar'));

    if (params.get('nuevo') === '1') {
      this.abrirNuevo();
      this.router.navigate(['/usuarios'], { replaceUrl: true });
    } else if (Number.isInteger(idEditar) && idEditar > 0) {
      this.idEditarPendiente = idEditar;
      this.router.navigate(['/usuarios'], { replaceUrl: true });
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.usuariosService.getAll().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);

        if (this.idEditarPendiente !== null) {
          const id = this.idEditarPendiente;
          this.idEditarPendiente = null;
          this.abrirEditarId(id);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'cargar los usuarios'));
        this.cargando.set(false);
      },
    });
  }

  iniciales(u: Usuario): string {
    return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();
  }

  etiquetaRol(rol: Usuario['rol']): string {
    const etiquetas: Record<Usuario['rol'], string> = {
      ADMIN: 'Administrador',
      OFICINA: 'Oficina',
      EMPLEADO: 'Empleado',
    };
    return etiquetas[rol];
  }

  cerrarError(): void {
    this.error.set('');
  }

  abrirNuevo(): void {
    this.usuarioEditandoId.set(null);
    this.drawerAbierto.set(true);
  }

  abrirEditar(usuario: Usuario): void {
    if (!this.auth.puedeGestionarUsuario(usuario.rol)) {
      this.error.set('No tenés permiso para editar este usuario.');
      return;
    }

    this.usuarioEditandoId.set(usuario.id);
    this.drawerAbierto.set(true);
  }

  private abrirEditarId(id: number): void {
    const usuario = this.usuarios().find((u) => u.id === id);

    if (!usuario) {
      this.error.set('No se encontró el usuario solicitado.');
      return;
    }

    if (!this.auth.puedeGestionarUsuario(usuario.rol)) {
      this.error.set('No tenés permiso para editar este usuario.');
      return;
    }

    this.usuarioEditandoId.set(id);
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.usuarioEditandoId.set(null);
  }

  alGuardar(usuario: Usuario): void {
    this.cerrarDrawer();
    this.usuarios.update((lista) => {
      const existe = lista.some((u) => u.id === usuario.id);
      return existe
        ? lista.map((u) => (u.id === usuario.id ? usuario : u))
        : [...lista, usuario];
    });
  }

  esPropio(u: Usuario): boolean {
    return String(u.id) === this.auth.getId();
  }

  desactivar(u: Usuario): void {
    if (!this.auth.puedeGestionarUsuario(u.rol)) {
      this.error.set('No tenés permiso para modificar este usuario.');
      return;
    }

    if (!confirm(`¿Desactivar a ${u.nombre} ${u.apellido}? No va a poder iniciar sesión.`)) return;

    this.usuariosService.desactivar(u.id).subscribe({
      next: () =>
        this.usuarios.update((lista) =>
          lista.map((x) => (x.id === u.id ? { ...x, activo: false } : x)),
        ),
      error: (err: HttpErrorResponse) =>
        this.error.set(mensajeError(err, `desactivar a ${u.nombre} ${u.apellido}`)),
    });
  }
}
