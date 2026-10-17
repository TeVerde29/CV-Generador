import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type {
  CVData,
  EducationItem,
  LayoutOption,
  PaletteColors,
} from '../../../core/models/cv-data';
import { PROFICIENCY_LABELS, SECTION_TITLES } from '../../../core/models/labels';
import {
  ALL_SECTION_KEYS,
  DEFAULT_SECTION_ORDER,
  SIDE_SECTION_KEYS,
  type SectionKey,
} from '../../../core/models/sections';

export type { SectionKey };

/**
 * Renders one CV "sheet".
 *
 * The visual variety (12 templates) is achieved purely with CSS custom
 * properties declared per template class, so every template shares this exact
 * DOM. That keeps the printable output identical to the on-screen preview and
 * keeps the markup ATS-friendly (no tables, text in reading order).
 */
@Component({
  selector: 'app-cv-document',
  imports: [NgTemplateOutlet],
  templateUrl: './cv-document.component.html',
  styleUrl: './cv-document.component.scss',
})
export class CvDocumentComponent {
  readonly data = input.required<CVData>();
  readonly templateId = input('folha');
  readonly layoutId = input<LayoutOption['id']>('single');
  readonly colors = input<PaletteColors>({
    primary: '#18181b',
    secondary: '#71717a',
    accent: '#3f3f46',
  });
  readonly showWatermark = input(false);
  readonly watermarkLabel = input('');
  /** User-controlled order; unknown/missing keys are normalised away. */
  readonly order = input<SectionKey[]>(DEFAULT_SECTION_ORDER);
  /** Section titles; a CV profile may override the defaults. */
  readonly titles = input<Record<SectionKey, string>>(SECTION_TITLES);
  /** Frame of the optional photo. */
  readonly photoShape = input<'square' | 'circle'>('square');

  readonly labels = PROFICIENCY_LABELS;

  /** A getter so the templates keep reading the titles as `T.section`. */
  get T(): Record<SectionKey, string> {
    return this.titles();
  }

  readonly sheetClass = computed(
    () => `cv-sheet tpl-${this.templateId()} layout-${this.layoutId()}`,
  );

  readonly profile = computed(() => this.data().personalInfo);

  readonly photo = computed(() => this.data().personalInfo.photo ?? '');

  readonly contacts = computed(() => {
    const p = this.profile();
    return [p.email, p.phone, p.location, p.website, p.linkedin, p.github, p.portfolio].filter(
      Boolean,
    ) as string[];
  });

  readonly hasSidebar = computed(
    () => this.layoutId() === 'sidebar-left' || this.layoutId() === 'sidebar-right',
  );
  readonly isTwoColumn = computed(() => this.layoutId() === 'two-column');

  /** Section order for the single-column and two-column layouts. */
  readonly singleOrder = computed<SectionKey[]>(() => {
    const provided = this.order().filter((k) => ALL_SECTION_KEYS.includes(k));
    const missing = ALL_SECTION_KEYS.filter((k) => !provided.includes(k));
    return [...provided, ...missing];
  });

  readonly mainOrder = computed(() =>
    this.singleOrder().filter((k) => !SIDE_SECTION_KEYS.includes(k)),
  );

  readonly sideOrder = computed(() =>
    this.singleOrder().filter((k) => SIDE_SECTION_KEYS.includes(k)),
  );

  private readonly visible = computed<Record<SectionKey, boolean>>(() => {
    const d = this.data();
    return {
      summary: d.summary.trim().length > 0,
      experience: d.experience.length > 0,
      education: d.education.length > 0,
      skills: d.skills.length > 0,
      languages: d.languages.length > 0,
      projects: d.projects.length > 0,
      certifications: d.certifications.length > 0,
      publications: d.publications.length > 0,
      volunteerWork: d.volunteerWork.length > 0,
      awards: d.awards.length > 0,
      interests: d.interests.length > 0,
    };
  });

  has(key: SectionKey): boolean {
    return this.visible()[key];
  }

  /* ── Template helpers (templates cannot use arrow functions) ─────────── */

  period(start?: string, end?: string): string {
    return [start, end].map((v) => (v ?? '').trim()).filter(Boolean).join(' – ');
  }

  degreeLine(ed: EducationItem): string {
    return [ed.degree, ed.field].filter(Boolean).join(', ');
  }

  joinComma(...parts: (string | undefined | null)[]): string {
    return parts.filter(Boolean).join(', ');
  }

  joinDot(...parts: (string | undefined | null)[]): string {
    return parts.filter(Boolean).join(' · ');
  }
}
