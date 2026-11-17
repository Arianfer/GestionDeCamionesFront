import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { LoginRequest, AuthResponse } from '../../../shared/models/auth.model';
import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from '../../../shared/utils/mensaje-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  credentials: LoginRequest = {
    dni: '',
    password: ''
  };

  errorMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    if (!this.credentials.dni || !this.credentials.password) {
      this.errorMessage = 'Por favor complete el DNI y la contraseña';
      this.alertService.error('Campos incompletos', 'Por favor completá el DNI y la contraseña.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (res: AuthResponse) => {
        this.isLoading = false;
        this.alertService.toastExito('¡Bienvenido a Ciageser S.A.!');
        if (res.rol === 'EMPLEADO') {
          this.router.navigate(['/chofer']);
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        // 401 "DNI o contraseña incorrectos", 400 "El usuario se encuentra inactivo…", 0 sin conexión
        const mensaje = mensajeError(err, 'iniciar sesión');
        this.errorMessage = mensaje;
        this.alertService.error('Error al iniciar sesión', mensaje);
      }
    });
  }
}