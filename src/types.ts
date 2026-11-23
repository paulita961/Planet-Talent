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
  fecha_nacimiento: string | null;
  edad: number;
  ciudad: string;
  whatsapp: string;
  correo: string;
  instagram: string;
  estatura: number | null;
  busto: number | null;
  cintura: number | null;
  caderas: number | null;
  talla_superior: string | null;
  talla_inferior: string | null;
  calzado: string | null;
  color_cabello: string | null;
  largo_cabello: string | null;
  color_ojos: string | null;
  tono_piel: string | null;
  tiene_piercings: boolean;
  tiene_tatuajes: boolean;
  detalle_piercings_tatuajes?: string | null;
  foto_cara?: string | null;
  foto_cuerpo?: string | null;
  origen?: 'web' | 'google_form' | string | null;
  nombre_artistico?: string | null;
  estado_cabello?: string | null;
  tiktok?: string | null;
  notas_importacion?: string | null;
  datos_incompletos?: boolean | null;
  campos_faltantes?: string[] | null;
  estado: CastingApplicationStatus;
  created_at: string;
}


