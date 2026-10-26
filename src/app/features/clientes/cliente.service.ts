import { HttpClient } from '@angular/common/http';
import { inject, Injectable} from '@angular/core';

import { environment } from '../../../environments/environment';
import { Cliente, ClienteRequest } from '../../shared/models/cliente.model';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ClienteService {

    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/clientes`;

    obtenerClientes(): Observable<Cliente[]> {
        return this.http.get<Cliente[]>(this.url);
    }

    obtenerClientePorId(id : number): Observable<Cliente>{
        return this.http.get<Cliente>(`${this.url}/${id}`);
    }

    crearCliente(cliente: ClienteRequest): Observable<Cliente> {
        return this.http.post<Cliente>(this.url, cliente);
    }

    actualizarCliente(id: number, cliente: ClienteRequest): Observable<Cliente> {
        return this.http.put<Cliente>(`${this.url}/${id}`, cliente);
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.url}/${id}`);
    }
}
