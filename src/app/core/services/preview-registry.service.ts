import { Injectable, signal } from '@angular/core';

/**
 * Holds a reference to the currently rendered A4 sheet.
 *
 * The PDF export works by cloning that live DOM node off screen and
 * rasterising it, so the file carries the very same markup the user sees.
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
