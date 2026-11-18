import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ServicioParada {
  id: number;
  nombre: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  direccion: string;
  tipoResiduo: 'RECICLABLE' | 'GENERAL';
  frecuencia: 'DIARIA' | 'SEMANAL' | 'QUINCENAL';
  latitud: number;
  longitud: number;
  orden: number;
  idRuta?: number;
  idCliente?: number;
  estadoParada?: 'PENDIENTE' | 'COMPLETADA' | 'FALLA' | 'INCIDENCIA';
  motivo?: string;
}

export interface RutaChofer {
  idRuta: number;
  nombre: string;
  descripcion: string;
  servicios: ServicioParada[];
  fecha?: string;
  idChofer?: number;
  nombreChofer?: string;
}

export interface TareaActiva {
  id: number;
  descripcion: string;
  fechaEjecucion: string;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  idCamion: number;
  idRuta: number;
  idUsuario: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChoferService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tareas`;
  private rutasUrl = `${environment.apiUrl}/rutas`;

  // Trae la ruta asignada con sus paradas ya ordenadas por el campo 'orden'
  obtenerMiRuta(choferId: number): Observable<RutaChofer> {
    return this.http.get<RutaChofer>(`${this.apiUrl}/mi-ruta/${choferId}`);
  }

  // Trae una ruta específica por su ID (para abrir la tarea del día seleccionado)
  obtenerRutaPorId(idRuta: number): Observable<RutaChofer> {
    return this.http.get<RutaChofer>(`${this.rutasUrl}/${idRuta}`);
  }

  // Trae las tareas activas (PENDIENTE o EN_CURSO) del chofer
  obtenerMisTareasActivas(choferId: number): Observable<TareaActiva[]> {
    return this.http.get<TareaActiva[]>(`${this.apiUrl}/mis-tareas/${choferId}`);
  }

  // Cambia el estado de la tarea (ej: de PENDIENTE a EN_CURSO o COMPLETADO)
  actualizarEstadoTarea(tareaId: number, nuevoEstado: 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO'): Observable<TareaActiva> {
    return this.http.patch<TareaActiva>(
      `${this.apiUrl}/${tareaId}/estado?nuevoEstado=${nuevoEstado}`,
      {}
    );
  }
}