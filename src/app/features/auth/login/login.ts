import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest, AuthResponse } from '../../../shared/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
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
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (res: AuthResponse) => {
        this.isLoading = false;
        if (res.rol === 'EMPLEADO') {
          this.router.navigate(['/chofer']);
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = 'DNI o contraseña incorrectos';
      }
    });
  }
}