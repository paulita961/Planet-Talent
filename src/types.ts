export interface Model {
  id: number;
  nombre: string;
  apellidos: string;
  instagram: string;
  edad: number;
  fecha_nacimiento?: string | null;
  ojos: string;
  piel: string;
  estatura: number;
  busto: number | null;
  cintura: number | null;
  caderas: number | null;
  calzado: string;
  photos: string[];
  disponible?: boolean;
  destacada?: boolean;
  created_at?: string | null;
}
