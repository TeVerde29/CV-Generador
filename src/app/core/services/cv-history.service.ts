import { Injectable, computed, signal } from '@angular/core';
import type { CVData } from '../models/cv-data';
import type { SectionKey } from '../models/sections';

/** Un paso del historial: datos del CV, orden de secciones y visibilidad. */
export interface Snapshot {
  cv: CVData;
  order: SectionKey[];
  hidden: SectionKey[];
}

/**
 * Historial de deshacer/rehacer.
 *
 * Gestiona pilas de snapshots independientes del store. El store es el que
 * decide cuándo grabar un snapshot (antes de cada mutación) y cuándo aplicar
 * uno (en undo/redo).
 *
 * Ediciones rápidas (menos de 700 ms) se agrupan en un solo paso para que un
 * deshacer no retroceda carácter por carácter ni movimiento por movimiento.
 */
@Injectable({ providedIn: 'root' })
export class CvHistoryService {
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private lastPushAt = 0;

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  /** Graba un snapshot antes de un cambio. */
  push(before: Snapshot): void {
    const now = Date.now();
    const isBurst = now - this.lastPushAt < 700 && this.past.length > 0;
    if (!isBurst) {
      this.past.push(structuredClone(before));
      if (this.past.length > 60) this.past.shift();
    }
    this.lastPushAt = now;
    this.future = [];
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(false);
  }

  /** Devuelve el snapshot anterior o null si no hay historial. */
  undo(): Snapshot | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(structuredClone(this.current));
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(true);
    return previous;
  }

  /** Devuelve el siguiente snapshot o null si no hay futuro. */
  redo(): Snapshot | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(structuredClone(this.current));
    this.canUndo.set(true);
    this.canRedo.set(this.future.length > 0);
    return next;
  }

  /** Limpia el historial (ej. al restaurar o importar). */
  clear(): void {
    this.past = [];
    this.future = [];
    this.lastPushAt = 0;
    this.canUndo.set(false);
    this.canRedo.set(false);
  }

  /** El estado actual como snapshot (para grabar antes de un cambio). */
  private get current(): Snapshot {
    // Se asigna desde fuera mediante setCurrent().
    return this._current;
  }

  private _current: Snapshot = { cv: {} as CVData, order: [], hidden: [] };

  /** El store establece el estado actual antes de cada push. */
  setCurrent(cv: CVData, order: SectionKey[], hidden: SectionKey[]): void {
    this._current = { cv, order, hidden };
  }
}
