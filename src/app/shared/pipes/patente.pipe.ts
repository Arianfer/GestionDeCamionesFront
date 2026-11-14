import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea una patente con espacios:
 *   AB123CD → AB 123 CD   (formato Mercosur)
 *   ABC123  → ABC 123     (formato anterior)
 * Si no coincide con ninguno de los dos formatos, la devuelve tal cual.
 */
@Pipe({ name: 'patente' })
export class PatentePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const p = value.replace(/\s/g, '').toUpperCase();

    const mercosur = /^([A-Z]{2})(\d{3})([A-Z]{2})$/.exec(p);
    if (mercosur) return `${mercosur[1]} ${mercosur[2]} ${mercosur[3]}`;

    const anterior = /^([A-Z]{3})(\d{3})$/.exec(p);
    if (anterior) return `${anterior[1]} ${anterior[2]}`;

    return value;
  }
}
