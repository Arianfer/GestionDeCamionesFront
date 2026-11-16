import { Frecuencia, Prioridad, TipoResiduo } from '../../shared/models/servicio.model';

export const ETIQUETAS_PRIORIDAD: Record<Prioridad, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const ETIQUETAS_RESIDUO: Record<TipoResiduo, string> = {
  GENERAL: 'General',
  RECICLABLE: 'Reciclable',
};

export const ETIQUETAS_FRECUENCIA: Record<Frecuencia, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  QUINCENAL: 'Quincenal',
};
