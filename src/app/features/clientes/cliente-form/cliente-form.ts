import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ClienteRequest } from '../../../shared/models/cliente.model';
import { ClienteService } from '../cliente.service';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.css',
})
export class ClienteForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clienteService = inject(ClienteService);

  /** Si hay id en la URL (/clientes/:id/editar) estamos editando; si no, creando. */
  private readonly id: number | null = (() => {
    const param = this.route.snapshot.paramMap.get('id');
    return param ? Number(param) : null;
  })();

  readonly esEdicion = this.id !== null;
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  // Mismas reglas que ClienteRequestDTO del back: CUIT de 11 números y razón social obligatoria.
  readonly form = this.fb.nonNullable.group({
    cuit: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    razonSocial: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
  });

  get cuit() {
    return this.form.controls.cuit;
  }

  get razonSocial() {
    return this.form.controls.razonSocial;
  }

  ngOnInit(): void {
    if (this.id === null) return;

    this.cargando.set(true);
    this.clienteService.obtenerClientePorId(this.id).subscribe({
      next: (cliente) => {
        this.form.patchValue({ cuit: cliente.cuit, razonSocial: cliente.razonSocial });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el cliente.');
      },
    });
  }

  /** Deja solo dígitos en el campo CUIT (por si pegan "30-71234567-8"). */
  soloDigitos(input: HTMLInputElement): void {
    const limpio = input.value.replace(/\D/g, '').slice(0, 11);
    if (limpio !== input.value) input.value = limpio;
    this.cuit.setValue(limpio);
  }

  guardar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datos: ClienteRequest = {
      cuit: this.form.controls.cuit.value,
      razonSocial: this.form.controls.razonSocial.value.trim(),
    };

    this.guardando.set(true);
    const peticion =
      this.id === null
        ? this.clienteService.crearCliente(datos)
        : this.clienteService.actualizarCliente(this.id, datos);

    peticion.subscribe({
      next: () => this.router.navigate(['/clientes']),
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.manejarError(err);
      },
    });
  }

  private manejarError(err: HttpErrorResponse): void {
    const body = err.error;

    if (err.status === 400 && body && typeof body === 'object') {
      // Error de negocio: { timestamp, error, status }
      if (typeof body.error === 'string') {
        this.error.set(body.error);
        return;
      }
      // Error de validación: { campo: "mensaje" }
      let hayErrorDeCampo = false;
      for (const campo of ['cuit', 'razonSocial'] as const) {
        const mensaje = body[campo];
        if (typeof mensaje === 'string') {
          this.form.controls[campo].setErrors({ servidor: mensaje });
          this.form.controls[campo].markAsTouched();
          hayErrorDeCampo = true;
        }
      }
      if (hayErrorDeCampo) return;
    }

    if (err.status === 0) {
      this.error.set('No se pudo conectar con el servidor.');
    } else if (err.status === 500) {
      // El back lanza RuntimeException sin manejador cuando el CUIT o la razón social ya existen.
      this.error.set('No se pudo guardar. Verificá que el CUIT y la razón social no estén repetidos.');
    } else {
      this.error.set('Ocurrió un error inesperado. Probá de nuevo.');
    }
  }
}
