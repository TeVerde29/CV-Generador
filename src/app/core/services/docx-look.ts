/**
 * Turns a template's design (`template-look.ts`) into the handful of units a
 * .docx understands.
 *
 * Word has no CSS, so the conversion is explicit and boring on purpose:
 *   · sizes      → half-points        (1 px = 0.75 pt = 1.5 half-points)
 *   · distances  → twips              (1 px = 0.75 pt = 15 twips)
 *   · tracking   → 1/20 pt            (same twips scale, applied per character)
 *   · line-height→ 240ths of a line   (Word's "multiple" line spacing)
 */

import type { PaletteColors } from '../models/cv-data';
import { lookFor, type LookColor, type TemplateLook } from '../models/template-look';

export interface DocxText {
  size: number;
  bold: boolean;
  upper: boolean;
  italic?: boolean;
  /** Extra letter spacing, in 1/20 pt. */
  tracking: number;
  color: string;
}

export interface DocxLook {
  /** Body face: sans or serif, from the template. */
  bodyFont: string;
  /** Face for headings and meta lines: mono on Técnico, the body face elsewhere. */
  accentFont: string;
  align: 'left' | 'center';
  /** The three palette slots, so item parts keep the colours of the preview. */
  primary: string;
  secondary: string;
  accent: string;
  /** Fixed document greys, exactly like `--cv-ink` / `--cv-muted` / `--cv-rule`. */
  ink: string;
  muted: string;
  rule: string;
  bodySize: number;
  line: number;
  /** Space above a section heading, in twips. */
  sectionGap: number;
  /** Page padding, in twips (`--cv-doc-pad`). */
  padY: number;
  padX: number;
  /** Usable width between the margins, in twips; where right tabs land. */
  textWidth: number;
  name: DocxText;
  title: DocxText;
  heading: DocxText & { rule: TemplateLook['heading']['rule']; edge: boolean; numbered: boolean };
}

const hp = (px: number): number => Math.round(px * 1.5);
const twips = (px: number): number => Math.round(px * 15);
/** em tracking at a given size, in 1/20 pt. */
const tracking = (em: number, sizePx: number): number => Math.round(em * sizePx * 15);

const FONTS = { sans: 'Segoe UI', serif: 'Georgia', mono: 'Consolas' } as const;

const hex = (color: string): string => (color || '#000000').replace('#', '').toUpperCase();

const DOC_INK = '1A1A1C';
const DOC_MUTED = '6B7280';
const DOC_RULE = 'E4E4E7';

/** A4 page width in twips (21 cm). */
const A4_WIDTH = 11906;

/**
 * A template chooses where each text takes its colour from; the palette fills
 * the three slots and the document keeps its own fixed ink/muted/rule greys,
 * exactly like the stylesheet does.
 */
export function docxLook(templateId: string, colors: PaletteColors): DocxLook {
  const look = lookFor(templateId);
  const palette: Record<LookColor, string> = {
    primary: hex(colors.primary),
    secondary: hex(colors.secondary),
    accent: hex(colors.accent),
    ink: DOC_INK,
  };
  const bodyFont = look.serif ? FONTS.serif : FONTS.sans;
  const accentFont = look.mono ? FONTS.mono : bodyFont;
  const padX = twips(look.padX);

  return {
    bodyFont,
    accentFont,
    align: look.align,
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    ink: DOC_INK,
    muted: DOC_MUTED,
    rule: DOC_RULE,
    bodySize: hp(look.base),
    line: Math.round(look.lineHeight * 240),
    sectionGap: twips(look.sectionGap),
    padY: twips(look.padY),
    padX,
    // A4 is 11906 twips wide; the tab stops have to land on the text edge.
    textWidth: A4_WIDTH - padX * 2,
    name: {
      size: hp(look.name.size),
      bold: look.name.weight >= 600,
      upper: look.name.upper,
      tracking: tracking(look.name.tracking, look.name.size),
      color: palette[look.name.color],
    },
    title: {
      size: hp(look.title.size),
      bold: look.title.weight >= 600,
      upper: look.title.upper,
      italic: look.title.italic,
      tracking: tracking(look.title.tracking, look.title.size),
      color: palette[look.title.color],
    },
    heading: {
      size: hp(look.heading.size),
      bold: look.heading.weight >= 600,
      upper: look.heading.upper,
      tracking: tracking(look.heading.tracking, look.heading.size),
      color: palette[look.heading.color],
      rule: look.heading.rule,
      edge: look.heading.edge,
      numbered: look.heading.numbered,
    },
  };
}
