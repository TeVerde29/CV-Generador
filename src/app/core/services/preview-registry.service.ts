import { Injectable, signal } from '@angular/core';

/**
 * Holds a reference to the currently rendered A4 sheet.
 *
 * The PDF export works by cloning that live DOM node into a print window, so
 * the printed document is byte-for-byte the same markup the user sees.
 */
@Injectable({ providedIn: 'root' })
export class PreviewRegistryService {
  readonly sheet = signal<HTMLElement | null>(null);

  register(element: HTMLElement | null): void {
    this.sheet.set(element);
  }

  clear(): void {
    this.sheet.set(null);
  }
}
