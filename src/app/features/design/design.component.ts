import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  DEFAULT_LAYOUT_ID,
  DEFAULT_PALETTE_ID,
  DEFAULT_TEMPLATE_ID,
  LAYOUTS,
  PALETTES,
  TEMPLATES,
  TEMPLATE_FAMILIES,
} from '../../core/models/catalog';
import type { LayoutOption, PaletteColors } from '../../core/models/cv-data';
import { PROFILES } from '../../core/models/profiles';
import { CvStoreService } from '../../core/services/cv-store.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-design',
  imports: [],
  templateUrl: './design.component.html',
  styleUrl: './design.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignComponent {
  readonly store = inject(CvStoreService);
  private readonly toast = inject(ToastService);

  readonly templates = TEMPLATES;
  readonly families = TEMPLATE_FAMILIES;
  readonly layouts = LAYOUTS;
  readonly palettes = PALETTES;
  readonly profiles = PROFILES;

  readonly custom = signal<PaletteColors>({
    primary: '#18181b',
    secondary: '#71717a',
    accent: '#3f3f46',
  });
  readonly paletteName = signal('');
  readonly presetName = signal('');

  templatesOf(family: string): typeof TEMPLATES {
    return this.templates.filter((t) => t.family === family);
  }

  selectTemplate(id: string): void {
    this.store.setTemplate(id);
  }

  /** Combo entries: the profile decides the sections, not the looks. */
  onProfileChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id !== 'custom') this.store.applyProfile(id);
  }

  onTemplateChange(event: Event): void {
    this.store.setTemplate((event.target as HTMLSelectElement).value);
  }

  selectLayout(id: LayoutOption['id']): void {
    this.store.setLayout(id);
  }

  selectPalette(id: string): void {
    this.store.setPalette(id);
    if (id !== 'custom') {
      const palette = this.palettes.find((p) => p.id === id);
      if (palette) this.custom.set(palette.colors);
    }
  }

  setColor(channel: keyof PaletteColors, value: string): void {
    const next: PaletteColors = { ...this.custom(), [channel]: value };
    this.custom.set(next);
    this.store.setCustomColors(next);
  }

  onColorInput(channel: keyof PaletteColors, event: Event): void {
    this.setColor(channel, (event.target as HTMLInputElement).value);
  }

  savePalette(): void {
    this.store.savePalette(this.paletteName());
    this.paletteName.set('');
    this.toast.ok('Paleta guardada en tu biblioteca.');
  }

  removePalette(id: string): void {
    this.store.removePalette(id);
  }

  savePreset(): void {
    this.store.savePreset(this.presetName());
    this.presetName.set('');
    this.toast.ok('Combinación guardada.');
  }

  resetDesign(): void {
    this.store.setTemplate(DEFAULT_TEMPLATE_ID);
    this.store.setLayout(DEFAULT_LAYOUT_ID);
    this.store.setPalette(DEFAULT_PALETTE_ID);
    this.store.resetSectionOrder();
    this.toast.show('Diseño restablecido al original.');
  }

  onNameInput(target: 'palette' | 'preset', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (target === 'palette') this.paletteName.set(value);
    else this.presetName.set(value);
  }
}
