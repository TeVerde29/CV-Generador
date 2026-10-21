/**
 * Canonical CV data model.
 * This single structure is the source of truth for the editor, the live
 * preview and every export format.
 */

export type Proficiency = 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';

export const PROFICIENCIES: Proficiency[] = [
  'native',
  'fluent',
  'advanced',
  'intermediate',
  'basic',
];

export interface PersonalInfo {
  name: string;
  title?: string;
  /** Optional photo, stored as a data URL. Off unless the user adds one. */
  photo?: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface SkillGroup {
  id: string;
  category: string;
  items: string[];
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: Proficiency;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  /** Live demo, when the project has one published. */
  demoUrl?: string;
  /** Source repository, when the code is public. */
  repoUrl?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface PublicationItem {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url?: string;
  description?: string;
}

export interface VolunteerItem {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface AwardItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  link: string;
  description: string;
  items: string[];
}

export interface CVData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  publications: PublicationItem[];
  volunteerWork: VolunteerItem[];
  awards: AwardItem[];
  interests: string[];
  references: ReferenceItem[];
  customSections: CustomSectionItem[];
}

/* ── Template / layout / palette catalog types ─────────────────────────── */

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  /** Group used to render the gallery sections. */
  family: 'Esencial' | 'Corporativo' | 'Creativo' | 'Académico';
  /** Typographic voice of the template. */
  voice: 'sans' | 'serif' | 'mixed' | 'mono';
}

export interface LayoutOption {
  id: 'single' | 'sidebar-left' | 'sidebar-right' | 'two-column';
  name: string;
  hint: string;
}

export interface PaletteColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface PaletteOption {
  id: string;
  name: string;
  colors: PaletteColors;
}

/** Saved template + layout + palette combination. */
export interface Preset {
  id: string;
  name: string;
  templateId: string;
  layoutId: LayoutOption['id'];
  paletteId: string;
  customColors: PaletteColors | null;
  createdAt: number;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: PaletteColors;
  createdAt: number;
}

/* ── Export ────────────────────────────────────────────────────────────── */

export type ExportFormat = 'docx' | 'pdf' | 'markdown';
