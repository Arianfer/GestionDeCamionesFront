import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

  private readonly links: NavLink[] = [
    { label: 'Inicio',    path: '/inicio',   roles: ['ADMIN', 'OFICINA', 'EMPLEADO'] },
    { label: 'Rutas',     path: '/rutas',    roles: ['ADMIN', 'OFICINA'] },
    { label: 'Clientes',  path: '/clientes', roles: ['ADMIN', 'OFICINA'] },
    { label: 'Servicios', path: '/servicios', roles: ['ADMIN', 'OFICINA'] },
  ];

  linksVisibles: NavLink[] = this.links.filter(l =>
    l.roles.includes(this.authService.getRol() ?? '')
  );

  onLogout(): void {
    this.authService.logout();
  }
}