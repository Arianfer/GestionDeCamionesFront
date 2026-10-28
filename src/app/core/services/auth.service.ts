import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequest, AuthResponse } from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8080/api/auth'; // Endpoint de Spring Boot[cite: 1]

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: AuthResponse) => {
        localStorage.setItem('token_jwt', res.token);
        localStorage.setItem('user_rol', res.rol);
        localStorage.setItem('user_nombre', res.nombre);
        localStorage.setItem('user_id', res.id.toString());
      })
    );
  }

  // SCRUM-45: Limpia la sesión completa y redirige al login
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
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
}