export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';
export type TipoResiduo = 'RECICLABLE' | 'GENERAL';
export type Frecuencia = 'DIARIA' | 'SEMANAL' | 'QUINCENAL';

export interface Servicio {
  id: number;
  nombre: string;
  prioridad: Prioridad;
  direccion: string;
  tipoResiduo: TipoResiduo;
  frecuencia: Frecuencia;
  latitud: number;
  longitud: number;
  orden: number;
  idRuta: number;
  idCliente: number;
}

export interface ServicioRequest {
  nombre: string;
  prioridad: Prioridad;
  direccion: string;
  tipoResiduo: TipoResiduo;
  frecuencia: Frecuencia;
  latitud: number;
  longitud: number;
  orden: number;
  idRuta: number;
  idCliente: number;
}