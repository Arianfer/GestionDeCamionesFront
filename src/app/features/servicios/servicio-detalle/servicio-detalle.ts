import { DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { Servicio } from '../../../shared/models/servicio.model';
import {
  ETIQUETAS_FRECUENCIA,
  ETIQUETAS_PRIORIDAD,
  ETIQUETAS_RESIDUO,
} from '../servicio-etiquetas';

@Component({
  selector: 'app-servicio-detalle',
  imports: [DecimalPipe],
  templateUrl: './servicio-detalle.html',
  styleUrl: './servicio-detalle.css',
})
export class ServicioDetalle implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) servicio!: Servicio;
  @Input() clienteNombre = '';
  @Input() rutaNombre = '';
  @Input() eliminando = false;
  @Output() editar = new EventEmitter<Servicio>();
  @Output() eliminar = new EventEmitter<Servicio>();

  @ViewChild('mapaDetalle') private mapaContenedor?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;
  private readonly CENTRO_MDP: L.LatLngExpression = [-38.0055, -57.5426];

  readonly etiquetasPrioridad = ETIQUETAS_PRIORIDAD;
  readonly etiquetasResiduo = ETIQUETAS_RESIDUO;
  readonly etiquetasFrecuencia = ETIQUETAS_FRECUENCIA;

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['servicio'] && this.map) {
      this.actualizarMapa();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  @HostListener('window:resize')
  alRedimensionar(): void {
    this.map?.invalidateSize();
  }

  private inicializarMapa(): void {
    const contenedor = this.mapaContenedor?.nativeElement;
    if (!contenedor) return;

    this.map = L.map(contenedor, {
      center: this.CENTRO_MDP,
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.actualizarMapa();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private actualizarMapa(): void {
    if (!this.map) return;

    const servicio = this.servicio;
    const tieneCoords =
      servicio &&
      Number.isFinite(servicio.latitud) &&
      Number.isFinite(servicio.longitud);

    if (!tieneCoords) {
      this.marker?.remove();
      this.marker = undefined;
      this.map.setView(this.CENTRO_MDP, 12);
      return;
    }

    const pos: L.LatLngExpression = [servicio.latitud, servicio.longitud];

    if (!this.marker) {
      const icono = L.divIcon({
        className: '',
        html: `<div style="
          width: 26px;
          height: 26px;
          background: #1b5e20;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        "></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      this.marker = L.marker(pos, { icon: icono }).addTo(this.map);
    } else {
      this.marker.setLatLng(pos);
    }

    this.map.setView(pos, 16);
  }
}
