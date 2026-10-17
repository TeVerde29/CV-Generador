import type { Proficiency } from './cv-data';

/** Human labels used by the preview, the Markdown export and the Word export. */
export const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  native: 'Nativo',
  fluent: 'Fluido',
  advanced: 'Avanzado',
  intermediate: 'Intermedio',
  basic: 'Básico',
};

export const SECTION_TITLES = {
  summary: 'Perfil profesional',
  experience: 'Experiencia profesional',
  education: 'Formación académica',
  skills: 'Competencias',
  languages: 'Idiomas',
  projects: 'Proyectos',
  certifications: 'Certificaciones',
  publications: 'Publicaciones',
  volunteerWork: 'Voluntariado',
  awards: 'Reconocimientos',
  interests: 'Intereses',
} as const;

/** File name safe for Windows/macOS/Linux and for the browser download API. */
export function safeFileName(name: string, fallback = 'cv'): string {
  const cleaned = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || fallback;
}
