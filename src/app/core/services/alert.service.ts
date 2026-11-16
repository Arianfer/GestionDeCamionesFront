import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private toastMixin = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });

  toastExito(mensaje: string): void {
    this.toastMixin.fire({
      icon: 'success',
      title: mensaje
    });
  }

  toastInfo(mensaje: string): void {
    this.toastMixin.fire({
      icon: 'info',
      title: mensaje
    });
  }

  error(titulo: string, texto?: string): void {
    Swal.fire({
      icon: 'error',
      title: titulo,
      text: texto,
      confirmButtonColor: '#17a2b8'
    });
  }

  async confirmarEliminacion(entidad: string, detalle?: string): Promise<boolean> {
    const res = await Swal.fire({
      title: `¿Eliminar ${entidad}?`,
      text: detalle || 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
    return res.isConfirmed;
  }

  async confirmarLogout(): Promise<boolean> {
    const res = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Vas a salir del sistema de Ciageser S.A.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Cerrar sesión',
      cancelButtonText: 'Quedarme',
      reverseButtons: true
    });
    return res.isConfirmed;
  }
}