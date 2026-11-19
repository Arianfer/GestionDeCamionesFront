/** Quita acentos y mayúsculas para que "Gomez" encuentre a "Gómez". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
