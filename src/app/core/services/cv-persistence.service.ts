import { Injectable } from '@angular/core';
import type { CVData } from '../models/cv-data';
import type { JsonDesign } from '../models/json-payload';
import { emptyCVData } from '../models/catalog';
import { normalizeCVData } from './cv-store.service';

export const STORAGE_KEYS = {
  data: 'cvgen.data',
  design: 'cvgen.design',
  presets: 'cvgen.presets',
  palettes: 'cvgen.palettes',
  offer: 'cvgen.offer',
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Persistencia en localStorage.
 *
 * Guarda y restaura los seis claves del generador: datos del CV, diseño,
 * presets, paletas guardadas y oferta de empleo. No depende de Angular
 * (no inyecta servicios), así que puede probarse sin TestBed.
 */
@Injectable({ providedIn: 'root' })
export class CvPersistenceService {
  /** Carga todo el estado guardado. Devuelve null si no hay nada. */
  restore(): {
    data: CVData;
    design: Partial<JsonDesign> | null;
    presets: unknown[];
    palettes: unknown[];
    offer: string;
  } | null {
    const raw = localStorage.getItem(STORAGE_KEYS.data);
    if (!raw) return null;

    return {
      data: normalizeCVData(safeParse(raw, emptyCVData())),
      design: safeParse<Partial<JsonDesign> | null>(
        localStorage.getItem(STORAGE_KEYS.design),
        null,
      ),
      presets: safeParse<unknown[]>(localStorage.getItem(STORAGE_KEYS.presets), []),
      palettes: safeParse<unknown[]>(localStorage.getItem(STORAGE_KEYS.palettes), []),
      offer: localStorage.getItem(STORAGE_KEYS.offer) ?? '',
    };
  }

  /** Guarda todo el estado en localStorage. */
  save(params: {
    data: CVData;
    design: JsonDesign;
    presets: unknown[];
    palettes: unknown[];
    offer: string;
  }): void {
    try {
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(params.data));
      localStorage.setItem(STORAGE_KEYS.design, JSON.stringify(params.design));
      localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(params.presets));
      localStorage.setItem(STORAGE_KEYS.palettes, JSON.stringify(params.palettes));
      localStorage.setItem(STORAGE_KEYS.offer, params.offer);
    } catch (err) {
      console.warn('[cv-persistence] No se pudo guardar:', err);
    }
  }

  /** Borra todo el almacenamiento del generador. */
  clear(): void {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
  }
}