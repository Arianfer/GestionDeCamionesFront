// usuario-form.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { Rol, UsuarioRequest } from '../../../shared/models/usuario.model';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.css',
})
export class UsuarioForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);

  // null = alta, número = edición
  id: number | null = null;

  guardando = signal(false);
  error = signal('');
  erroresBackend = signal<Record<string, string>>({});

  // ADMIN asigna cualquier rol; OFICINA solo puede crear/editar EMPLEADO
  rolesDisponibles = computed<Rol[]>(() =>
    this.auth.getRol() === 'ADMIN' ? ['ADMIN', 'OFICINA', 'EMPLEADO'] : ['EMPLEADO'],
  );

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    email: ['', [Validators.required, Validators.email]],
    rol: ['EMPLEADO' as Rol, Validators.required],
  });

  get esEdicion() {
    return this.id !== null;
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.id = Number(idParam);
    // La contraseña inicial sale del DNI, así que en edición no se cambia
    this.form.controls.dni.disable();

    this.usuariosService.getById(this.id).subscribe({
      next: (u) =>
        this.form.patchValue({
          nombre: u.nombre,
          apellido: u.apellido,
          dni: u.dni,
          email: u.email,
          rol: u.rol,
        }),
      error: () => this.error.set('No se pudo cargar el usuario (o no tenés permiso para verlo).'),
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.erroresBackend.set({});

    // getRawValue incluye el DNI aunque esté deshabilitado
    const body: UsuarioRequest = this.form.getRawValue();
    const peticion = this.esEdicion
      ? this.usuariosService.actualizar(this.id!, body)
      : this.usuariosService.crear(body);

    peticion.subscribe({
      next: () => this.router.navigate(['/usuarios']),
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
}