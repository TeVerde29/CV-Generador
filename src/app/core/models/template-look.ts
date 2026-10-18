/**
 * Each template's design, once, in the stylesheet's own units.
 *
 * The preview and the PDF get their looks straight from CSS custom
 * properties. A .docx has no CSS, so the same knobs have to exist as data if
 * the Word file is going to look like what the user picked. This file is the
 * mirror of the `.tpl-*` blocks in `cv-document.component.scss`: keep the two
 * in sync when a template changes.
 *
 * Values are CSS pixels, line-height ratios and em tracking, exactly as they
 * are written in the stylesheet. `docxLookFor` converts them.
 */

export type LookColor = 'primary' | 'secondary' | 'accent' | 'ink';
export type LookRule = 'none' | 'solid' | 'thick' | 'dashed';

export interface TemplateLook {
  /** Serif body (Manuscrito, Executivo, Consultoría, Académico…). */
  serif: boolean;
  /** Monospaced headings and meta lines (Técnico). */
  mono: boolean;
  /** Centred header and headings (Académico, Universidad). */
  align: 'left' | 'center';
  /** Body size in px. */
  base: number;
  /** Unitless line-height. */
  lineHeight: number;
  /** Vertical gap between sections, in px. */
  sectionGap: number;
  /** Inner sheet padding, in px (the `--cv-doc-pad` shorthand). */
  padY: number;
  padX: number;
  name: {
    size: number;
    weight: number;
    upper: boolean;
    tracking: number;
    color: LookColor;
  };
  title: {
    size: number;
    weight: number;
    upper: boolean;
    italic: boolean;
    tracking: number;
    color: LookColor;
  };
  heading: {
    size: number;
    weight: number;
    upper: boolean;
    tracking: number;
    color: LookColor;
    rule: LookRule;
    /** The 3px accent bar to the left of the title (Consultoría). */
    edge: boolean;
    /** Sections numbered "1. ", "2. " (Tesis). */
    numbered: boolean;
  };
}

/** The `:host .cv-sheet` defaults; every template only overrides what changes. */
export const BASE_LOOK: TemplateLook = {
  serif: false,
  mono: false,
  align: 'left',
  base: 12.6,
  lineHeight: 1.55,
  sectionGap: 16,
  padY: 42,
  padX: 40,
  name: { size: 30, weight: 700, upper: false, tracking: -0.02, color: 'primary' },
  title: { size: 13, weight: 500, upper: false, italic: false, tracking: 0.01, color: 'secondary' },
  heading: {
    size: 10.5,
    weight: 700,
    upper: true,
    tracking: 0.14,
    color: 'primary',
    rule: 'solid',
    edge: false,
    numbered: false,
  },
};

/** A patch may change the top-level knobs or just a few nested ones. */
type LookPatch = Partial<Omit<TemplateLook, 'name' | 'title' | 'heading'>> & {
  name?: Partial<TemplateLook['name']>;
  title?: Partial<TemplateLook['title']>;
  heading?: Partial<TemplateLook['heading']>;
};

const look = (patch: LookPatch): TemplateLook => ({
  ...BASE_LOOK,
  ...patch,
  name: { ...BASE_LOOK.name, ...(patch.name ?? {}) },
  title: { ...BASE_LOOK.title, ...(patch.title ?? {}) },
  heading: { ...BASE_LOOK.heading, ...(patch.heading ?? {}) },
});

/** One entry per template id in `TEMPLATES` (`catalog.ts`). */
export const TEMPLATE_LOOKS: Record<string, TemplateLook> = {
  folha: look({}),
  linha: look({
    name: { size: 26, weight: 600, upper: true, tracking: 0.16 },
    heading: { size: 10, tracking: 0.2, color: 'ink', rule: 'thick' },
  }),
  manuscrito: look({
    serif: true,
    base: 13,
    name: { size: 34, weight: 600, tracking: -0.005 },
    title: { size: 14.5, italic: true },
    heading: { size: 13, weight: 700, upper: false, tracking: 0.01 },
  }),
  corporativo: look({
    name: { size: 27, weight: 700, upper: true, tracking: 0.05 },
    heading: { size: 11, rule: 'none' },
  }),
  executivo: look({
    serif: true,
    name: { size: 32, weight: 500, tracking: 0.015 },
    heading: { size: 9.5, weight: 600, tracking: 0.26, color: 'secondary', rule: 'none' },
  }),
  consultoria: look({
    serif: true,
    base: 12.4,
    lineHeight: 1.48,
    sectionGap: 14,
    name: { size: 26 },
    heading: { size: 14, upper: false, tracking: 0, color: 'ink', rule: 'none', edge: true },
  }),
  tecnico: look({
    mono: true,
    name: { size: 24, tracking: -0.01 },
    heading: { size: 10, tracking: 0.06, color: 'accent', rule: 'dashed' },
  }),
  revista: look({
    name: { size: 38, weight: 800, tracking: -0.03 },
    title: { size: 13.5, upper: true, tracking: 0.18 },
    heading: { size: 11, color: 'accent', rule: 'none' },
  }),
  compacto: look({
    base: 11.8,
    lineHeight: 1.42,
    sectionGap: 11,
    padY: 30,
    padX: 32,
    name: { size: 23 },
    heading: { size: 9.5 },
  }),
  academico: look({
    serif: true,
    align: 'center',
    name: { size: 28, weight: 600 },
    title: { italic: true },
    heading: { size: 13.5, weight: 600, upper: false, tracking: 0 },
  }),
  universidad: look({
    serif: true,
    align: 'center',
    name: { size: 24, upper: true, tracking: 0.14 },
    heading: { size: 11, tracking: 0.18, rule: 'thick' },
  }),
  tesis: look({
    serif: true,
    heading: { size: 12.5, upper: false, tracking: 0, rule: 'none', numbered: true },
  }),
};

export const lookFor = (templateId: string): TemplateLook =>
  TEMPLATE_LOOKS[templateId] ?? BASE_LOOK;
