/**
 * The JSON that travels in and out of the app.
 *
 * It carries the whole state: the CV itself and the design that dresses it
 * (template, layout, palette, section order and visibility). That way a file
 * downloaded today reopens exactly as it was left, and another program can
 * read the data without having to understand the design.
 */

import type { CVData, PaletteColors } from './cv-data';
import { ALL_SECTION_KEYS, type SectionKey } from './sections';

export const JSON_VERSION = 1;

/** The design that dresses the document. */
export interface JsonDesign {
  templateId: string;
  layoutId: string;
  paletteId: string;
  customColors: PaletteColors | null;
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  photoShape: 'square' | 'circle';
  showWatermark: boolean;
  watermarkText: string;
}

/** A whole state: the CV and its design. */
export interface JsonPayload {
  version: number;
  data: CVData;
  design: JsonDesign;
}

/** The payload as it is written to a file, with the usual two-space indent. */
export function stringifyJson(cv: CVData, design: JsonDesign): string {
  const payload: JsonPayload = { version: JSON_VERSION, data: cv, design };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Reads a JSON that may be a whole payload or just the CV data.
 *
 * It is deliberately tolerant: a file hand-edited, or saved by an older
 * version, still loads as long as the data is recognisable.
 */
export function parseJson(raw: string): { data: CVData; design: Partial<JsonDesign> } {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('El archivo no contiene un currículum.');
  }
  const bag = parsed as Record<string, unknown>;
  // Un payload trae los datos en `data`; un JSON suelto, directamente.
  const data = (bag['data'] ?? bag) as CVData;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('El archivo no contiene un currículum.');
  }
  const design = (bag['design'] ?? {}) as Partial<JsonDesign>;
  return { data, design: design && typeof design === 'object' ? design : {} };
}

/** Keeps only the section keys that exist, and puts back the missing ones. */
export function normalizeSectionOrder(order: unknown): SectionKey[] | null {
  if (!Array.isArray(order)) return null;
  const known = order.filter((key): key is SectionKey =>
    ALL_SECTION_KEYS.includes(key as SectionKey),
  );
  const missing = ALL_SECTION_KEYS.filter((key) => !known.includes(key));
  return [...known, ...missing];
}

/** Keeps only the section keys that exist. */
export function normalizeHiddenSections(hidden: unknown): SectionKey[] | null {
  if (!Array.isArray(hidden)) return null;
  return hidden.filter((key): key is SectionKey =>
    ALL_SECTION_KEYS.includes(key as SectionKey),
  );
}
