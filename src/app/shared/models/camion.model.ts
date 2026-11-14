export type TipoCamion = 'RECOLECTOR' | 'BARRIOS_PRIVADOS' | 'DAILY';
export type EstadoCamion = 'DISPONIBLE' | 'EN_RUTA' | 'EN_MANTENIMIENTO';

export interface Camion {
  id: number;
  patente: string;
  tipo: TipoCamion;
  estadoCamion: EstadoCamion;
  capacidadCarga: number;
  consumoDieselPorKm: number | null;
}

export interface CamionRequest {
  patente: string;
  tipo: TipoCamion;
  estadoCamion: EstadoCamion;
  capacidadCarga: number;
}