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

  /** Confirmación con la misma animación y estilo que ya usa el alta de servicios. */
  async confirmar({
    titulo,
    texto = 'Esta acción no se puede deshacer.',
    confirmText = 'Sí, eliminar',
    icon = 'warning',
    confirmColor = '#dc3545',
  }: {
    titulo: string;
    texto?: string;
    confirmText?: string;
    icon?: 'warning' | 'question' | 'info' | 'error';
    confirmColor?: string;
  }): Promise<boolean> {
    const res = await Swal.fire({
      title: titulo,
      text: texto,
      icon,
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#6c757d',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
    return res.isConfirmed;
  }

  confirmarEliminacion(entidad: string, detalle?: string): Promise<boolean> {
    return this.confirmar({
      titulo: `¿Eliminar ${entidad}?`,
      texto: detalle,
    });
  }

  confirmarLogout(): Promise<boolean> {
    return this.confirmar({
      titulo: '¿Cerrar sesión?',
      texto: 'Vas a salir del sistema de Ciageser S.A.',
      confirmText: 'Cerrar sesión',
      icon: 'question',
    });
  }
}
