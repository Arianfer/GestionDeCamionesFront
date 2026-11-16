import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Rol, Usuario, UsuarioRequest } from '../../../shared/models/usuario.model';
import { UsuariosService } from '../usuarios.service';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.css',
})
export class UsuarioForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuariosService = inject(UsuariosService);
  private readonly auth = inject(AuthService);

  @Input() usuarioId: number | null = null;
  @Input() embebido = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Usuario>();

  id: number | null = null;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly erroresBackend = signal<Record<string, string>>({});

  readonly rolesDisponibles = computed<Rol[]>(() =>
    this.auth.getRol() === 'ADMIN' ? ['ADMIN', 'OFICINA', 'EMPLEADO'] : ['EMPLEADO'],
  );

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    email: ['', [Validators.required, Validators.email]],
    rol: ['EMPLEADO' as Rol, Validators.required],
  });

  get esEdicion(): boolean {
    return this.id !== null;
  }

  ngOnInit(): void {
    const idParam = this.embebido
      ? this.usuarioId
      : this.route.snapshot.paramMap.get('id')
        ? Number(this.route.snapshot.paramMap.get('id'))
        : null;

    if (idParam === null) return;

    this.id = idParam;
    this.form.controls.dni.disable();
    this.cargando.set(true);

    this.usuariosService.getById(this.id).subscribe({
      next: (usuario) => {
        this.form.patchValue({
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          dni: usuario.dni,
          email: usuario.email,
          rol: usuario.rol,
        });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el usuario (o no tenés permiso para verlo).');
      },
    });
  }

  etiquetaRol(rol: Rol): string {
    const etiquetas: Record<Rol, string> = {
      ADMIN: 'Administrador',
      OFICINA: 'Oficina',
      EMPLEADO: 'Empleado',
    };
    return etiquetas[rol];
  }

  guardar(): void {
    this.error.set('');
    this.erroresBackend.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);

    const body: UsuarioRequest = this.form.getRawValue();
    const peticion = this.esEdicion
      ? this.usuariosService.actualizar(this.id!, body)
      : this.usuariosService.crear(body);

    peticion.subscribe({
      next: (usuario) => {
        this.guardando.set(false);
        if (this.embebido) {
          this.guardado.emit(usuario);
        } else {
          this.router.navigate(['/usuarios']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 400 && err.error && typeof err.error === 'object') {
          this.erroresBackend.set(err.error);
        } else if (err.status === 403) {
          this.error.set('No tenés permiso para realizar esta acción.');
        } else {
          this.error.set('No se pudo guardar. Puede que el DNI o el email ya existan.');
        }
      },
    });
  }

  cancelar(): void {
    if (this.embebido) this.cerrar.emit();
  }
}
