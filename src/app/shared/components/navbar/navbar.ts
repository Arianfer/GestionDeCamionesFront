import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

interface NavLink {
  label: string;
  path: string;
  roles: string[];
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  private readonly links: NavLink[] = [
    { label: 'Inicio',    path: '/inicio',    roles: ['ADMIN', 'OFICINA', 'EMPLEADO'] },
    { label: 'Rutas',     path: '/rutas',     roles: ['ADMIN', 'OFICINA'] },
    { label: 'Clientes',  path: '/clientes',  roles: ['ADMIN', 'OFICINA'] },
    { label: 'Servicios', path: '/servicios', roles: ['ADMIN', 'OFICINA'] },
    { label: 'Usuarios', path: '/usuarios', roles: ['ADMIN', 'OFICINA'] },
  ];

  linksVisibles: NavLink[] = this.links.filter(l =>
    l.roles.includes(this.authService.getRol() ?? '')
  );

  async onLogout(): Promise<void> {
    const confirmado = await this.alertService.confirmarLogout();
    if (!confirmado) return;

    this.authService.logout();
    this.alertService.toastInfo('Sesión cerrada');
    this.router.navigate(['/login']);
  }
}