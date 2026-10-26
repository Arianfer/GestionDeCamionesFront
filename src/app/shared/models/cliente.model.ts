/*Modelo del clienteResponseDTO*/
export interface Cliente {
    id: number;
    cuit: string;
    razonSocial: string;
}
/*Modelo del clienteRequest (POST/ PUT) */
export type ClienteRequest = Omit<Cliente, 'id'>;

