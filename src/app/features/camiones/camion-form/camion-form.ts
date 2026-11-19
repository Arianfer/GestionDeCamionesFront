import { HttpErrorResponse } from '@angular/common/http';
import {Component,EventEmitter,Input,OnInit,Output,inject,signal,} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { erroresDeValidacion, mensajeError } from '../../../shared/utils/mensaje-error';
import {Camion,CamionRequest,EstadoCamion,TipoCamion,} from '../../../shared/models/camion.model';
import { CamionesService } from '../camiones.service';

@Component({
  selector: 'app-camion-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './camion-form.html',
  styleUrl: './camion-form.css',
})
export class CamionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly camionesService = inject(CamionesService);

  @Input() camionId: number | null = null;
  @Input() embebido = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Camion>();

  id: number | null = null;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly erroresBackend = signal<Record<string, string>>({});

  readonly tipos: { valor: TipoCamion; etiqueta: string }[] = [
    { valor: 'RECOLECTOR', etiqueta: 'Recolector' },
    { valor: 'BARRIOS_PRIVADOS', etiqueta: 'Barrios privados' },
    { valor: 'DAILY', etiqueta: 'Daily' },
  ];

  readonly estados: { valor: EstadoCamion; etiqueta: string }[] = [
    { valor: 'DISPONIBLE', etiqueta: 'Disponible' },
    { valor: 'EN_RUTA', etiqueta: 'En ruta' },
    { valor: 'EN_MANTENIMIENTO', etiqueta: 'En mantenimiento' },
  ];

  readonly form = this.fb.group({
    patente: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[A-Z]{2}[0-9]{3}[A-Z]{2}$|^[A-Z]{3}[0-9]{3}$/),
    ]),
    tipo: this.fb.nonNullable.control<TipoCamion>('RECOLECTOR', Validators.required),
    estadoCamion: this.fb.nonNullable.control<EstadoCamion>(
      'DISPONIBLE',
      Validators.required,
    ),
    // SCRUM-151: al crear quedan vacíos y el back asigna los valores según el tipo.
    // Solo se muestran y se pueden ajustar al editar.
    capacidadCarga: this.fb.control<number | null>(null, [Validators.min(1)]),
    consumoDieselPorKm: this.fb.control<number | null>(null, [Validators.min(0.01)]),
  });

  get esEdicion(): boolean {
    return this.id !== null;
  }

  ngOnInit(): void {
    const idParam = this.embebido
      ? this.camionId
      : this.route.snapshot.paramMap.get('id')
        ? Number(this.route.snapshot.paramMap.get('id'))
        : null;

    if (idParam === null) return;

    this.id = idParam;
    this.cargando.set(true);

    this.camionesService.obtenerCamionPorId(this.id).subscribe({
      next: (camion) => {
        this.form.patchValue({
          patente: camion.patente,
          tipo: camion.tipo,
          estadoCamion: camion.estadoCamion,
          capacidadCarga: camion.capacidadCarga,
          consumoDieselPorKm: camion.consumoDieselPorKm,
        });
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeError(err, 'cargar el camión'));
      },
    });
  }

  soloPatente(input: HTMLInputElement): void {
    const limpio = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (limpio !== input.value) input.value = limpio;
    this.form.controls.patente.setValue(limpio);
  }

  guardar(): void {
    this.error.set('');
    this.erroresBackend.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    // SCRUM-151: al crear no se mandan capacidad ni consumo (los pone el back según el tipo).
    // Al editar se mandan los valores del formulario; si quedan vacíos, el back conserva los que tenía.
    const body: CamionRequest = {
      patente: v.patente.trim().toUpperCase(),
      tipo: v.tipo,
      estadoCamion: v.estadoCamion,
      capacidadCarga:
        !this.esEdicion || v.capacidadCarga === null ? null : Number(v.capacidadCarga),
      consumoDieselPorKm:
        !this.esEdicion || v.consumoDieselPorKm === null ? null : Number(v.consumoDieselPorKm),
    };

    this.guardando.set(true);
    const peticion = this.esEdicion
      ? this.camionesService.actualizarCamion(this.id!, body)
      : this.camionesService.crearCamion(body);

    peticion.subscribe({
      next: (camion) => {
        this.guardando.set(false);
        if (this.embebido) {
          this.guardado.emit(camion);
        } else {
          this.router.navigate(['/camiones']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);

        const campos = erroresDeValidacion(err);
        if (campos) {
          this.erroresBackend.set(campos);
          return;
        }

        // 409 "Ya existe un camión registrado con la patente…", 400 de negocio, etc.
        this.error.set(mensajeError(err, 'guardar el camión'));
      },
    });
  }

  cancelar(): void {
    if (this.embebido) this.cerrar.emit();
  }
}