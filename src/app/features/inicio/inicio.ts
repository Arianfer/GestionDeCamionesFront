import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { Camion } from '../../shared/models/camion.model';
import { Cliente } from '../../shared/models/cliente.model';
import { Prioridad, Servicio } from '../../shared/models/servicio.model';
import { Ruta } from '../../shared/models/ruta.model';
import { Usuario } from '../../shared/models/usuario.model';
import { CamionesService } from '../camiones/camiones.service';
import { ClienteService } from '../clientes/cliente.service';
import { RutasService } from '../rutas/rutas.service';
import { ServiciosService } from '../servicios/servicios.service';
import { UsuariosService } from '../usuarios/usuarios.service';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const PESO_PRIORIDAD: Record<Prioridad, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };

function fechaHoy(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly rutasService = inject(RutasService);
  private readonly clienteService = inject(ClienteService);
  private readonly serviciosService = inject(ServiciosService);
  private readonly camionesService = inject(CamionesService);
  private readonly usuariosService = inject(UsuariosService);

  readonly nombreUsuario = signal('Usuario');
  readonly rolUsuario = signal('OPERADOR');

  readonly rutas = signal<Ruta[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly servicios = signal<Servicio[]>([]);
  readonly camiones = signal<Camion[]>([]);
  readonly usuarios = signal<Usuario[]>([]);

  readonly cargando = signal(true);
  readonly error = signal('');

  readonly puedeGestionar = computed(() => {
    const rol = this.rolUsuario();
    return rol === 'ADMIN' || rol === 'OFICINA';
  });

  readonly totalParadas = computed(() =>
    this.rutas().reduce((total, ruta) => total + (ruta.servicios?.length ?? 0), 0),
  );

  readonly camionesDisponibles = computed(
    () => this.camiones().filter((c) => c.estadoCamion === 'DISPONIBLE').length,
  );

  readonly camionesEnRuta = computed(
    () => this.camiones().filter((c) => c.estadoCamion === 'EN_RUTA').length,
  );

  readonly camionesEnMantenimiento = computed(
    () => this.camiones().filter((c) => c.estadoCamion === 'EN_MANTENIMIENTO').length,
  );

  readonly capacidadTotal = computed(() =>
    this.camiones().reduce((total, camion) => total + (camion.capacidadCarga ?? 0), 0),
  );

  readonly usuariosActivos = computed(() => this.usuarios().filter((u) => u.activo).length);

  readonly serviciosAlta = computed(
    () => this.servicios().filter((s) => s.prioridad === 'ALTA').length,
  );

  readonly rutasDestacadas = computed(() => {
    const hoy = fechaHoy();
    const ordenadas = [...this.rutas()].sort((a, b) =>
      (a.fecha ?? '').localeCompare(b.fecha ?? ''),
    );
    const proximas = ordenadas.filter((ruta) => (ruta.fecha ?? '') >= hoy);
    return (proximas.length > 0 ? proximas : ordenadas).slice(0, 3);
  });

  readonly serviciosPrioritarios = computed(() =>
    [...this.servicios()]
      .sort((a, b) => PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] || a.orden - b.orden)
      .slice(0, 3),
  );

  ngOnInit(): void {
    this.nombreUsuario.set(this.authService.getNombre() || 'Usuario');
    this.rolUsuario.set(this.authService.getRol() || 'OPERADOR');

    if (this.puedeGestionar()) {
      this.cargar();
    } else {
      this.cargando.set(false);
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      rutas: this.rutasService.getAll(),
      clientes: this.clienteService.obtenerClientes(),
      servicios: this.serviciosService.getAll(),
      camiones: this.camionesService.obtenerTodos(),
      usuarios: this.usuariosService.getAll(),
    }).subscribe({
      next: ({ rutas, clientes, servicios, camiones, usuarios }) => {
        this.rutas.set(rutas);
        this.clientes.set(clientes);
        this.servicios.set(servicios);
        this.camiones.set(camiones);
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.rutas.set([]);
        this.clientes.set([]);
        this.servicios.set([]);
        this.camiones.set([]);
        this.usuarios.set([]);
        this.cargando.set(false);
        this.error.set(
          err.status === 0
            ? 'No se pudo conectar con el servidor.'
            : 'No se pudieron cargar los indicadores.',
        );
      },
    });
  }

  paradasDe(ruta: Ruta): number {
    return ruta.servicios?.length ?? 0;
  }

  resumenTrayecto(ruta: Ruta): string {
    const servicios = [...(ruta.servicios ?? [])].sort((a, b) => a.orden - b.orden);
    if (servicios.length === 0) return 'Sin paradas asignadas';
    if (servicios.length === 1) return servicios[0].nombre;
    return `${servicios[0].nombre} → ${servicios[servicios.length - 1].nombre}`;
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    const [anio, mes, dia] = fecha.split('-').map(Number);
    if (!anio || !mes || !dia) return fecha;
    return `${dia} ${MESES[mes - 1]} ${anio}`;
  }

  etiquetaPrioridad(prioridad: Prioridad): string {
    return prioridad.charAt(0) + prioridad.slice(1).toLowerCase();
  }

  etiquetaResiduo(tipo: Servicio['tipoResiduo']): string {
    return tipo === 'RECICLABLE' ? 'Reciclable' : 'General';
  }

  etiquetaFrecuencia(frecuencia: Servicio['frecuencia']): string {
    const etiquetas: Record<Servicio['frecuencia'], string> = {
      DIARIA: 'Diaria',
      SEMANAL: 'Semanal',
      QUINCENAL: 'Quincenal',
    };
    return etiquetas[frecuencia];
  }
}
