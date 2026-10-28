import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements OnInit {
  private authService = inject(AuthService);
  
  nombreUsuario: string = '';
  rolUsuario: string = '';

  ngOnInit(): void {
    this.nombreUsuario = this.authService.getNombre() || 'Usuario';
    this.rolUsuario = this.authService.getRol() || 'OPERADOR';
  }
}