import { Pipe, PipeTransform } from '@angular/core';

/** Formatea un CUIT de 11 dígitos como XX-XXXXXXXX-X. Si no tiene 11 dígitos, lo devuelve tal cual. */
@Pipe({ name: 'cuit' })
export class CuitPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const digitos = value.replace(/\D/g, '');
    if (digitos.length !== 11) return value;
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
  }
}
