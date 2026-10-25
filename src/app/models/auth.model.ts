export interface LoginRequest {
  dni: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  nombre: string;
  apellido: string;
  rol: string;
  token: string;
}