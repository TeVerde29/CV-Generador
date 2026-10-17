/**
 * Section identity and default ordering.
 *
 * Lives in `core/models` so both the store and the renderer can use it without
 * the store depending on a component.
 */

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certifications'
  | 'publications'
  | 'volunteerWork'
  | 'awards'
  | 'interests';

/** Every section, in the default reading order. */
export const ALL_SECTION_KEYS: SectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
  'publications',
  'volunteerWork',
  'awards',
  'interests',
];

export const DEFAULT_SECTION_ORDER: SectionKey[] = [...ALL_SECTION_KEYS];

/** Sections that move to the side column when a sidebar layout is active. */
export const SIDE_SECTION_KEYS: SectionKey[] = [
  'skills',
  'languages',
  'certifications',
  'interests',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Perfil profesional',
  experience: 'Experiencia',
  education: 'Formación',
  skills: 'Competencias',
  languages: 'Idiomas',
  projects: 'Proyectos',
  certifications: 'Certificaciones',
  publications: 'Publicaciones',
  volunteerWork: 'Voluntariado',
  awards: 'Reconocimientos',
  interests: 'Intereses',
};

/** Short helper used by the editor for "N elementos" badges. */
export const SECTION_HINTS: Record<SectionKey, string> = {
  summary: 'Dos o tres frases que resumen quién eres profesionalmente.',
  experience: 'Puestos con logros medibles.',
  education: 'Titulaciones y estudios.',
  skills: 'Agrupa las competencias por familia.',
  languages: 'Idiomas y nivel real de uso.',
  projects: 'Trabajos propios, open source o de equipo.',
  certifications: 'Certificados con emisor y fecha.',
  publications: 'Artículos, ponencias o libros.',
  volunteerWork: 'Actividad solidaria o asociativa.',
  awards: 'Premios y reconocimientos.',
  interests: 'Aficiones, con moderación.',
};
