import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RutasService } from '../rutas.service';
import { RutaRequest } from '../../../shared/models/ruta.model';
import { Servicio } from '../../../shared/models/servicio.model';
import { Usuario } from '../../../shared/models/usuario.model';

@Component({
  selector: 'app-ruta-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ruta-form.html',
  styleUrl: './ruta-form.css',
})
export class RutaForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rutasService = inject(RutasService);

  // null = alta, número = edición
  id: number | null = null;

  guardando = signal(false);
  error = signal('');
  erroresBackend = signal<Record<string, string>>({});

  // Choferes disponibles para el selector
  usuarios = signal<Usuario[]>([]);
  choferes = computed(() =>
    this.usuarios().filter((u) => u.rol === 'EMPLEADO' && u.activo),
  );

  // Servicios de la ruta (solo en edición) y estado del reordenamiento
  servicios = signal<Servicio[]>([]);
  ordenModificado = signal(false);
  guardandoOrden = signal(false);
  mensajeOrden = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    descripcion: ['', [Validators.required, Validators.maxLength(400)]],
    // fecha de hoy en formato YYYY-MM-DD, en hora local
    fecha: [new Date().toLocaleDateString('en-CA'), Validators.required],
    idChofer: [null as number | null, Validators.required],
  });

  get esEdicion() {
    return this.id !== null;
  }

  ngOnInit() {
    this.rutasService.obtenerChoferes().subscribe({
      next: (data) => this.usuarios.set(data),
      error: () => this.error.set('No se pudieron cargar los choferes.'),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.rutasService.getById(this.id).subscribe({
        next: (r) => {
          this.form.patchValue({
            nombre: r.nombre,
            descripcion: r.descripcion,
            fecha: r.fecha ?? '',
            idChofer: r.idChofer,
          });
          // servicios puede venir null; los ordeno por "orden"
          this.servicios.set(
            [...(r.servicios ?? [])].sort((a, b) => a.orden - b.orden),
          );
        },
        error: () => this.error.set('No se pudo cargar la ruta.'),
      });
    }
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.erroresBackend.set({});

    const v = this.form.getRawValue();
    const body: RutaRequest = {
      nombre: v.nombre,
      descripcion: v.descripcion,
      fecha: v.fecha,
      idChofer: v.idChofer!,
    };

    const peticion = this.esEdicion
      ? this.rutasService.actualizar(this.id!, body)
      : this.rutasService.crear(body);

    peticion.subscribe({
      next: () => this.router.navigate(['/rutas']),
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 400 && err.error && typeof err.error === 'object') {
          this.erroresBackend.set(err.error);
        } else {
          this.error.set(
            'No se pudo guardar. Puede que ya exista una ruta con ese nombre.',
          );
        }
      },
    });
  }

  // ---- Reordenar servicios ----

  mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    const lista = [...this.servicios()];
    if (destino < 0 || destino >= lista.length) return;

    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    this.servicios.set(lista);
    this.ordenModificado.set(true);
    this.mensajeOrden.set('');
  }

  guardarOrden() {
    this.guardandoOrden.set(true);
    this.mensajeOrden.set('');

    const ids = this.servicios().map((s) => s.id);
    this.rutasService.reordenarServicios(ids).subscribe({
      next: () => {
        this.guardandoOrden.set(false);
        this.ordenModificado.set(false);
        this.mensajeOrden.set('Orden guardado.');
      },
      error: () => {
        this.guardandoOrden.set(false);
        this.mensajeOrden.set('No se pudo guardar el orden.');
      },
    });
  }
}