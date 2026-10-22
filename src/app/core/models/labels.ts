import type { Proficiency } from './cv-data';

/** Human labels used by the preview, the Markdown export and the Word export. */
export const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  native: 'Nativo',
  fluent: 'Fluido',
  advanced: 'Avanzado',
  intermediate: 'Intermedio',
  basic: 'Básico',
};

/**
 * What the reader sees instead of a raw URL. The links travel as their target,
 * but the document shows a name: a header full of "linkedin.com/in/…" is noise,
 * and the label is what a person actually scans for.
 */
export const CONTACT_LABELS = {
  website: 'Web',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  portfolio: 'Portafolio',
} as const;

export const PROJECT_LABELS = { demo: 'Demo', repo: 'GitHub' } as const;

/**
 * The text a lone link shows in the document. The address goes in the tooltip,
 * not in the CV: a line of full URLs is noise for whoever reads it.
 */
export const LINK_LABEL = 'Enlace';

/**
 * Turns a stored link into something a browser can follow. Values are typed by
 * hand, so "linkedin.com/in/x" and "https://linkedin.com/in/x" both have to
 * work: the scheme is added only when it is missing.
 */
export function toHref(value?: string): string {
  const link = (value ?? '').trim();
  if (!link) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//')) return link;
  return `https://${link}`;
}

export const SECTION_TITLES = {
  summary: 'Perfil profesional',
  experience: 'Experiencia profesional',
  education: 'Formación Académica',
  skills: 'Habilidades y Competencias',
  languages: 'Idiomas',
  projects: 'Proyectos',
  certifications: 'Certificaciones y cursos',
  publications: 'Publicaciones',
  volunteerWork: 'Voluntariado',
  awards: 'Reconocimientos',
  interests: 'Intereses',
  references: 'Referencias',
  customSection: 'Sección Personalizada',
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
