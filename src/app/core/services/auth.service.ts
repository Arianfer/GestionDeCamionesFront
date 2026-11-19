import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequest, AuthResponse } from '../../shared/models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly sessionKeys = ['token_jwt', 'user_rol', 'user_nombre', 'user_id'] as const;
  private navegandoAlLogin = false;

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: AuthResponse) => {
        this.navegandoAlLogin = false;
        localStorage.setItem('token_jwt', res.token);
        localStorage.setItem('user_rol', res.rol);
        localStorage.setItem('user_nombre', res.nombre);
        localStorage.setItem('user_id', res.id.toString());
      })
    );
  }

  logout(): void {
    this.limpiarSesion();

    if (this.navegandoAlLogin || this.router.url === '/login') return;

    this.navegandoAlLogin = true;
    void this.router.navigate(['/login']).finally(() => {
      this.navegandoAlLogin = false;
    });
  }

  limpiarSesion(): void {
    this.sessionKeys.forEach((clave) => localStorage.removeItem(clave));
  }

  sesionActiva(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const expiracion = this.obtenerExpiracion(token);
    return expiracion !== null && expiracion > Date.now();
  }

  private obtenerExpiracion(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const datos = JSON.parse(atob(base64)) as { exp?: number };
      return typeof datos.exp === 'number' ? datos.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token_jwt');
  }

  getRol(): string | null {
    return localStorage.getItem('user_rol');
  }

  getNombre(): string | null {
    return localStorage.getItem('user_nombre');
  }

  getId(): string | null {
    return localStorage.getItem('user_id');
  }

  puedeGestionarUsuario(rol: string): boolean {
    const rolActual = this.getRol();
    return (
      rolActual === 'ADMIN' || (rolActual === 'OFICINA' && rol === 'EMPLEADO')
    );
  }
}
