import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

type Icono = 'inicio' | 'rutas' | 'clientes' | 'servicios' | 'usuarios' | 'camiones' | 'tareas';

interface NavLink {
  label: string;
  path: string;
  icono: Icono;
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

  private readonly links: NavLink[] = [
    { label: 'Inicio',    path: '/inicio',    icono: 'inicio',    roles: ['ADMIN', 'OFICINA', 'EMPLEADO'] },
    { label: 'Rutas',     path: '/rutas',     icono: 'rutas',     roles: ['ADMIN', 'OFICINA'] },
    { label: 'Clientes',  path: '/clientes',  icono: 'clientes',  roles: ['ADMIN', 'OFICINA'] },
    { label: 'Servicios', path: '/servicios', icono: 'servicios', roles: ['ADMIN', 'OFICINA'] },
    { label: 'Usuarios',  path: '/usuarios',  icono: 'usuarios',  roles: ['ADMIN', 'OFICINA'] },
    { label: 'Camiones',  path: '/camiones',  icono: 'camiones',  roles: ['ADMIN', 'OFICINA'] },
    { label: 'Tareas',    path: '/tareas',    icono: 'tareas',    roles: ['ADMIN', 'OFICINA'] },
  ];

  private readonly visibles: NavLink[] = this.links.filter(l =>
    l.roles.includes(this.authService.getRol() ?? '')
  );

  /** "Inicio" va aparte, como botón destacado a la derecha. */
  readonly inicio: NavLink | undefined = this.visibles.find(l => l.path === '/inicio');

  /** Links que van dentro de la píldora central. */
  readonly linksVisibles: NavLink[] = this.visibles.filter(l => l.path !== '/inicio');

  /** Menú desplegable en pantallas chicas. */
  readonly menuAbierto = signal(false);

  toggleMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  async onLogout(): Promise<void> {
    this.cerrarMenu();
    const confirmado = await this.alertService.confirmarLogout();
    if (!confirmado) return;

    this.authService.logout();
    this.alertService.toastInfo('Sesión cerrada');
  }
}