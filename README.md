# Gestión de Camiones — Frontend

## Descripción General del Sistema
Aplicación web desarrollada en Angular para la gestión operativa de una empresa de recolección de residuos (**CIAGESER**): clientes, flota de camiones, rutas con mapa, servicios, tareas y la jornada de cada chofer.

Proyecto final de la materia **Programación IV** — Tecnicatura Universitaria en Programación, UTN FRMdP.

El backend (Spring Boot) está en [Arianfer/GestionDeCamiones](https://github.com/Arianfer/GestionDeCamiones).

---

## Contenido

- [Equipo](#equipo)
- [Funcionalidades](#funcionalidades)
- [Roles y permisos](#roles-y-permisos)
- [Tecnologías](#tecnologías)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Configuración](#configuración)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Convenciones del equipo](#convenciones-del-equipo)
- [Flujo de trabajo (Git y Jira)](#flujo-de-trabajo-git-y-jira)

---

## Equipo

Proyecto desarrollado por un equipo de 4 integrantes:

- Walter Díaz
- Arian Shaffer
- Agustin Christiansen
- Santiago Tucker

---

## Funcionalidades

| Módulo | Qué permite |
|---|---|
| **Autenticación** | Inicio de sesión con JWT, rutas protegidas por rol, redirección de usuarios ya logueados. |
| **Inicio** | Resumen de rutas, disponibilidad de flota, clientes y servicios (ADMIN/OFICINA). Acceso directo a "Mi jornada" para el chofer. |
| **Clientes** | Alta, edición, baja y búsqueda por ID, CUIT o razón social. CUIT con formato `20-12345678-9`. |
| **Camiones** | Listado con filtros por estado y por ID/patente, alta y edición en un panel lateral. La capacidad y el consumo se asignan según el tipo de camión. |
| **Rutas** | ABM de rutas y visualización del recorrido en un mapa interactivo. |
| **Servicios** | ABM de servicios con selección de dirección sobre el mapa (geocodificación y búsqueda de direcciones) y vista de detalle. |
| **Tareas** | Listado en tarjetas con buscador y filtro por estado, alta de tareas y cambio de estado según las transiciones válidas: `PENDIENTE → EN_CURSO / CANCELADO`, `EN_CURSO → COMPLETADO / CANCELADO`. |
| **Usuarios** | ABM de usuarios del sistema. |
| **Vista del chofer** | El empleado ve su ruta del día, sus paradas y sus tareas asignadas. |

---

## Roles y permisos

| Rol | Alcance |
|---|---|
| `ADMIN` | Acceso completo al sistema. |
| `OFICINA` | Gestión operativa: clientes, camiones, rutas, servicios, tareas y usuarios. |
| `EMPLEADO` | Chofer: Vista operativa enfocada únicamente en sus tareas asignadas y la visualización de su ruta del día con paradas ordenadas. |

El control por rol del frontend se aplica con `authGuard` y `roleGuard`. Sirve para la experiencia de usuario; la restricción real de los endpoints la hace el backend.

---

## Tecnologías

- **[Angular 22](https://angular.dev/)** con componentes *standalone* y carga diferida (*lazy loading*) por feature.
- **TypeScript 6** y **RxJS 7**.
- **HTML5 / CSS3**, sin librerías de UI.
- **[Leaflet](https://leafletjs.com/)** + OpenStreetMap para los mapas.
- **[SweetAlert2](https://sweetalert2.github.io/)** para confirmaciones y notificaciones.
- **APIs de geocodificación:** [Georef (datos.gob.ar)](https://datosgobar.github.io/georef-ars-api/) y [Nominatim](https://nominatim.org/).
- **[Vitest](https://vitest.dev/)** + jsdom para los tests unitarios.
- **Prettier** para el formato del código.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) 24 (desarrollado con `v24.19.0`).
- npm (el proyecto fija `npm@11`).
- [Angular CLI](https://angular.dev/tools/cli): `npm install -g @angular/cli` *(opcional, también se puede usar `npx ng`)*.
- El **backend** corriendo en `http://localhost:8080` (ver su [README](https://github.com/Arianfer/GestionDeCamiones)).

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/Arianfer/GestionDeCamionesFront.git
cd GestionDeCamionesFront

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm start
```

`npm install` instala todo lo que el proyecto necesita (Angular, Leaflet, SweetAlert2 y el resto), porque ya figura en `package.json`. No hace falta instalar ninguna librería a mano.

Abrí `http://localhost:4200/`. La aplicación se recarga sola cuando modificás un archivo.

---

## Configuración

La URL del backend se define en `src/environments/`:

```ts
// src/environments/environment.ts
export const environment = {
  apiUrl: 'http://localhost:8080/api',
};
```

Si tu backend corre en otro host o puerto, cambiá `apiUrl` en `environment.ts` y en `environment.development.ts`.

---

## Usuarios de prueba

Para recorrer la aplicación con cada rol (con el backend levantado y su base de datos cargada):

| Rol | Usuario | Contraseña |
|---|---|---|
| ADMIN / OFICINA | `45576748` | `6748` |
| EMPLEADO (chofer) | `30123456` | `3456` |

El mismo usuario sirve para ADMIN y OFICINA.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200`. |
| `npm run build` | Build de producción en `dist/`. |
| `npm run watch` | Build en modo desarrollo, reconstruye al guardar. |
| `npm test` | Tests unitarios con Vitest. |

---

## Estructura del proyecto

```text
src/
├── environments/              # URL del backend
└── app/
    ├── core/                  # Lógica transversal de la app
    │   ├── guards/            # auth, guest y role
    │   ├── interceptors/      # JWT y manejo de errores de sesión
    │   └── services/          # auth, alertas, chofer, georef
    ├── features/              # Un módulo por funcionalidad (carga diferida)
    │   ├── auth/login
    │   ├── inicio
    │   ├── clientes/
    │   ├── camiones/
    │   ├── rutas/             # listado, formulario y mapa
    │   ├── servicios/         # listado, formulario y detalle
    │   ├── tareas/
    │   ├── usuarios/
    │   └── empleado/          # vista del chofer
    ├── layouts/
    │   └── main-layout/       # navbar + router-outlet
    └── shared/                # Reutilizable entre features
        ├── components/        # navbar
        ├── models/            # interfaces que espejan los DTOs del backend
        ├── pipes/             # CUIT, patente
        ├── paginador/
        └── utils/             # mensajes de error, normalización, popups de mapa
```

---

## Convenciones del equipo

- **Componentes:** sin sufijo `.component` → `camion-list/camion-list.ts` (+ `.html`, `.css`, `.spec.ts`), clase `CamionList`.
- **Services:** en plural → `camiones.service.ts`, clase `CamionesService`.
- **Pipes:** `cuit.pipe.ts`, `patente.pipe.ts`.
- **Models:** `camion.model.ts`; espejan los DTOs del backend.
- **Rutas:** un `*.routes.ts` por feature, enlazado en `app.routes.ts` con `loadChildren`. Las rutas protegidas llevan `canActivate: [roleGuard]` y `data: { roles: [...] }`.
- Los componentes **no** llaman a `HttpClient`: lo hace el service de su feature.
- Una feature no importa de otra; lo compartido va en `shared/`.

---

## Flujo de trabajo (Git y Jira)

- Nadie commitea directo a `main`: todo entra por **Pull Request**.
- Cada rama, commit y PR lleva la **clave de Jira** del ticket:
  - Rama: `feature/SCRUM-147-validaciones-formularios`
  - Commit: `SCRUM-147 Hago obligatoria la descripción de la tarea`
  - PR: con la clave en el título.
- Un commit por cambio con sentido; se agregan archivos por ruta puntual (nunca `git add .`).
- Estados en Jira: **En curso** al empezar → **En revisión** con el PR abierto → **Finalizado** al mergear.
