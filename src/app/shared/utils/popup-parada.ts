export interface DatosPopupParada {
  nombre?: string | null;
  direccion?: string | null;
  tipoResiduo?: string | null;
}

export function crearPopupParada(numero: number, parada: DatosPopupParada): HTMLElement {
  const contenedor = document.createElement('div');
  contenedor.className = 'popup-parada';

  const titulo = document.createElement('strong');
  titulo.textContent = `#${numero} - ${parada.nombre ?? ''}`;
  contenedor.appendChild(titulo);

  const direccion = document.createElement('div');
  direccion.textContent = parada.direccion ?? '';
  contenedor.appendChild(direccion);

  if (parada.tipoResiduo) {
    const residuo = document.createElement('small');
    residuo.textContent = `Residuo: ${parada.tipoResiduo}`;
    contenedor.appendChild(residuo);
  }

  return contenedor;
}
