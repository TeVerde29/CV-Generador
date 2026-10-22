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
  | 'interests'
  | 'references'
  | 'customSection';

/** Every section, in the default reading order. */
export const ALL_SECTION_KEYS: SectionKey[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'languages',
  'certifications',
  'publications',
  'awards',
  'volunteerWork',
  'customSection',
  'interests',
  'references',
];

export const DEFAULT_SECTION_ORDER: SectionKey[] = [...ALL_SECTION_KEYS];

/** Sections that move to the side column when a sidebar layout is active. */
export const SIDE_SECTION_KEYS: SectionKey[] = [
  'skills',
  'languages',
  'certifications',
  'interests',
];

export const isSideSection = (key: SectionKey): boolean => SIDE_SECTION_KEYS.includes(key);

/**
 * The editor owns the order, but it can arrive partial or stale (an imported
 * JSON, an older version, a section added after the fact), so the renderers
 * rebuild it: first what the user decided, in that order, then whatever is
 * missing.
 */
export function orderedSections(order: readonly SectionKey[]): SectionKey[] {
  const provided = order.filter((key) => ALL_SECTION_KEYS.includes(key));
  const missing = ALL_SECTION_KEYS.filter((key) => !provided.includes(key));
  return [...provided, ...missing];
}

/**
 * The order the document is read in. With a sidebar, the side column is
 * rendered first, so both the preview and the exports have to agree on that or
 * the Word file would list the sections in a different order than the screen.
 */
export function documentOrder(
  order: readonly SectionKey[],
  layout: string,
): SectionKey[] {
  const all = orderedSections(order);
  if (layout !== 'sidebar-left' && layout !== 'sidebar-right') return all;
  return [...all.filter(isSideSection), ...all.filter((key) => !isSideSection(key))];
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Perfil profesional',
  experience: 'Experiencia',
  education: 'Formación Académica',
  skills: 'Habilidades y Competencias',
  languages: 'Idiomas',
  projects: 'Proyectos',
  certifications: 'Certificaciones, cursos y eventos',
  publications: 'Publicaciones',
  volunteerWork: 'Voluntariado',
  awards: 'Reconocimientos',
  interests: 'Intereses',
  references: 'Referencias personales',
  customSection: 'Sección Personalizada',
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
  references: 'Personas que pueden hablar de tu trabajo.',
  customSection: 'Título libre, fechas, enlace y entradas propias.',
};
