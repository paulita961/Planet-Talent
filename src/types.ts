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

export type CastingApplicationStatus =
  | 'pendiente'
  | 'preseleccionada'
  | 'seleccionada'
  | 'descartada';

export interface CastingApplication {
  id: number;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  edad: number;
  ciudad: string;
  whatsapp: string;
  correo: string;
  instagram: string;
  estatura: number;
  busto: number | null;
  cintura: number | null;
  caderas: number | null;
  talla_superior: string;
  talla_inferior: string;
  calzado: string;
  color_cabello: string;
  largo_cabello: string;
  color_ojos: string;
  tono_piel: string;
  tiene_piercings: boolean;
  tiene_tatuajes: boolean;
  detalle_piercings_tatuajes?: string | null;
  foto_cara?: string | null;
  foto_cuerpo?: string | null;
  estado: CastingApplicationStatus;
  created_at: string;
}

