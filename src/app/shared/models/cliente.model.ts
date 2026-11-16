/*Modelo del clienteResponseDTO*/
export interface Cliente {
    id: number;
    cuit: string;
    razonSocial: string;
    activo?: boolean;
}
/*Modelo del clienteRequest (POST/ PUT) */
export type ClienteRequest = Omit<Cliente, 'id' | 'activo'>;

