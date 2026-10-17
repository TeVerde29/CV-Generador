/**
 * CV profiles ("tipo de plantilla").
 *
 * A profile is not a look: it decides **which sections** the document shows,
 * in **what order**, and with **what titles**. The visual templates (the twelve
 * `tpl-*` classes) are a separate axis; any profile combines with any template.
 *
 * The profiles mirror the archetypes a recruiter expects to find in the wild:
 * a student CV, a first-job CV, an executive CV… Each one comes from a real
 * reference document, so the section order is the one a reader of that profile
 * expects to see first.
 */

import { ALL_SECTION_KEYS, type SectionKey } from './sections';

export interface CvProfile {
  id: string;
  name: string;
  description: string;
  /** Sections the profile shows, in reading order. Anything absent is hidden. */
  order: SectionKey[];
  /** Document titles that differ from the default `SECTION_TITLES`. */
  titles?: Partial<Record<SectionKey, string>>;
}

export const DEFAULT_PROFILE_ID = 'predeterminado';

export const PROFILES: CvProfile[] = [
  {
    id: 'predeterminado',
    name: 'Predeterminado',
    description: 'Todas las secciones, en el orden habitual del documento.',
    order: [...ALL_SECTION_KEYS],
  },
  {
    id: 'clasico',
    name: 'Clásico',
    description: 'Formato de primer empleo: la formación abre el documento.',
    order: ['education', 'experience', 'volunteerWork', 'skills', 'interests', 'languages'],
    titles: {
      education: 'Educación',
      volunteerWork: 'Liderazgo y actividades',
      skills: 'Habilidades',
    },
  },
  {
    id: 'ejecutivo',
    name: 'Ejecutivo',
    description: 'Perfil directivo: experiencia y áreas de especialidad al frente.',
    order: ['experience', 'education', 'volunteerWork', 'skills', 'languages'],
    titles: {
      experience: 'Experiencia profesional',
      education: 'Educación',
      volunteerWork: 'Directorios y actividades',
      skills: 'Áreas de especialidad',
    },
  },
  {
    id: 'tecnico',
    name: 'Técnico',
    description: 'Competencias, proyectos y certificaciones con el mismo peso que el empleo.',
    order: ['education', 'skills', 'experience', 'projects', 'certifications', 'languages'],
    titles: {
      education: 'Educación',
      skills: 'Competencias técnicas',
    },
  },
  {
    id: 'estudiante',
    name: 'Estudiante',
    description: 'Proyectos académicos y actividades antes que la experiencia.',
    order: ['education', 'projects', 'experience', 'volunteerWork', 'skills', 'languages'],
    titles: {
      education: 'Educación',
      projects: 'Proyectos académicos',
      volunteerWork: 'Liderazgo y actividades',
      skills: 'Habilidades',
    },
  },
  {
    id: 'sin-experiencia',
    name: 'Sin experiencia',
    description: 'Primer empleo: formación, proyectos, voluntariado y cursos.',
    order: ['education', 'projects', 'volunteerWork', 'certifications', 'skills', 'languages'],
    titles: {
      education: 'Educación',
      projects: 'Proyectos y trabajos académicos',
      volunteerWork: 'Voluntariado y liderazgo',
      certifications: 'Cursos y certificaciones',
      skills: 'Habilidades',
    },
  },
  {
    id: 'una-pagina',
    name: 'Una página',
    description: 'Solo lo esencial, para que quepa en una cara sin apretar.',
    order: ['education', 'experience', 'skills', 'languages'],
    titles: {
      education: 'Educación',
      skills: 'Habilidades',
    },
  },
  {
    id: 'ricra',
    name: 'Ricra',
    description: 'Perfil técnico completo: resumen, habilidades por familias y proyectos.',
    order: [
      'summary',
      'skills',
      'experience',
      'projects',
      'education',
      'languages',
      'certifications',
    ],
    titles: {
      summary: 'Resumen profesional',
      skills: 'Habilidades técnicas',
      experience: 'Experiencia profesional',
      projects: 'Proyectos relevantes',
      education: 'Educación',
      certifications: 'Certificaciones y cursos',
    },
  },
];

export const findProfile = (id: string): CvProfile | undefined =>
  PROFILES.find((p) => p.id === id);

/** True for the profile used when the user has not chosen one. */
export const isDefaultProfile = (id: string): boolean => id === DEFAULT_PROFILE_ID;

/** Sections a profile leaves out. */
export function profileHidden(profile: CvProfile): SectionKey[] {
  return ALL_SECTION_KEYS.filter((k) => !profile.order.includes(k));
}

/** Full permutation: the profile's sections first, then the rest. */
export function profileFullOrder(profile: CvProfile): SectionKey[] {
  return [...profile.order, ...profileHidden(profile)];
}
