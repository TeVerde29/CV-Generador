import { Injectable, computed, signal } from '@angular/core';
import {
  DEFAULT_LAYOUT_ID,
  DEFAULT_PALETTE_ID,
  DEFAULT_TEMPLATE_ID,
  LAYOUTS,
  PALETTES,
  TEMPLATES,
} from '../models/catalog';
import type { LayoutOption, PaletteColors, PaletteOption } from '../models/cv-data';
import { SECTION_TITLES } from '../models/labels';
import {
  normalizeHiddenSections,
  normalizeSectionOrder,
  type JsonDesign,
} from '../models/json-payload';
import {
  findProfile,
  profileFullOrder,
  profileHidden,
  PROFILES,
} from '../models/profiles';
import {
  ALL_SECTION_KEYS,
  DEFAULT_SECTION_ORDER,
  isSideSection,
  orderedSections,
  type SectionKey,
} from '../models/sections';
import type { SavedPalette, Preset } from '../models/cv-data';
import { uid } from './cv-store.service';

/**
 * Configuración de diseño: plantilla, layout, paleta, forma de foto,
 * orden y visibilidad de secciones, perfiles y presets.
 */
@Injectable({ providedIn: 'root' })
export class CvDesignService {
  readonly templateId = signal<string>(DEFAULT_TEMPLATE_ID);
  readonly layoutId = signal<LayoutOption['id']>(DEFAULT_LAYOUT_ID);
  readonly paletteId = signal<string>(DEFAULT_PALETTE_ID);
  readonly customColors = signal<PaletteColors | null>(null);
  readonly photoShape = signal<'square' | 'circle'>('square');
  readonly presets = signal<Preset[]>([]);
  readonly savedPalettes = signal<SavedPalette[]>([]);
  /** Orden de las secciones en el documento renderizado. */
  readonly sectionOrder = signal<SectionKey[]>([...DEFAULT_SECTION_ORDER]);
  /** Secciones desactivadas: conservan sus datos pero dejan el documento. */
  readonly hiddenSections = signal<SectionKey[]>([]);
  /** Línea opcional al pie de los documentos exportados (off por defecto). */
  readonly showWatermark = signal(false);
  readonly watermarkText = signal('');

  readonly template = computed(() => TEMPLATES.find((t) => t.id === this.templateId()) ?? TEMPLATES[0]);
  readonly layout = computed(() => LAYOUTS.find((l) => l.id === this.layoutId()) ?? LAYOUTS[0]);
  readonly palette = computed<PaletteOption | null>(() => {
    const id = this.paletteId();
    if (id === 'custom') {
      const colors = this.customColors();
      return colors ? { id: 'custom', name: 'Personalizada', colors } : null;
    }
    const saved = this.savedPalettes().find((p) => p.id === id);
    if (saved) return { id: saved.id, name: saved.name, colors: saved.colors };
    return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
  });
  readonly colors = computed<PaletteColors>(() => this.palette()?.colors ?? PALETTES[0].colors);

  /** Perfil activo derivado del orden y visibilidad actuales. */
  readonly activeProfileId = computed<string>(() => {
    const order = this.sectionOrder().join(',');
    const hidden = [...this.hiddenSections()].sort().join(',');
    for (const p of PROFILES) {
      const sameOrder = profileFullOrder(p).join(',') === order;
      const sameHidden = profileHidden(p).slice().sort().join(',') === hidden;
      if (sameOrder && sameHidden) return p.id;
    }
    return 'custom';
  });

  readonly profile = computed(() => findProfile(this.activeProfileId()) ?? null);

  /** Títulos impresos en el documento; un perfil puede sobrescribir los por defecto. */
  readonly sectionTitles = computed<Record<SectionKey, string>>(() => ({
    ...SECTION_TITLES,
    ...(this.profile()?.titles ?? {}),
  }));

  readonly hasSidebar = computed(() => this.layoutId() === 'sidebar-left' || this.layoutId() === 'sidebar-right');

  /* ── Mutadores de diseño ───────────────────────────────────────────── */

  setTemplate(id: string): void {
    this.templateId.set(id);
  }

  setLayout(id: LayoutOption['id']): void {
    this.layoutId.set(id);
  }

  setPalette(id: string): void {
    this.paletteId.set(id);
    if (id !== 'custom') this.customColors.set(null);
  }

  setCustomColors(colors: PaletteColors): void {
    this.customColors.set(colors);
    this.paletteId.set('custom');
  }

  setPhotoShape(shape: 'square' | 'circle'): void {
    this.photoShape.set(shape);
  }

  setWatermark(enabled: boolean, text: string): void {
    this.showWatermark.set(enabled);
    this.watermarkText.set(text);
  }

  /** Aplica las partes válidas de un diseño (JSON importado o restaurado). */
  applyDesign(design: Partial<JsonDesign>): void {
    if (typeof design.templateId === 'string') this.templateId.set(design.templateId);
    if (typeof design.layoutId === 'string') {
      this.layoutId.set(design.layoutId as LayoutOption['id']);
    }
    if (typeof design.paletteId === 'string') this.paletteId.set(design.paletteId);
    if (design.customColors === null || typeof design.customColors === 'object') {
      this.customColors.set(design.customColors ?? null);
    }
    const order = normalizeSectionOrder(design.sectionOrder);
    if (order) this.sectionOrder.set(order);
    const hidden = normalizeHiddenSections(design.hiddenSections);
    if (hidden) this.hiddenSections.set(hidden);
    if (design.photoShape === 'circle' || design.photoShape === 'square') {
      this.photoShape.set(design.photoShape);
    }
    if (typeof design.showWatermark === 'boolean') {
      this.showWatermark.set(design.showWatermark);
    }
    if (typeof design.watermarkText === 'string') {
      this.watermarkText.set(design.watermarkText);
    }
  }

  /** Aplica un perfil: su orden de secciones, su visibilidad y sus títulos. */
  applyProfile(id: string): void {
    const profile = findProfile(id);
    if (!profile) return;
    this.sectionOrder.set(profileFullOrder(profile));
    this.hiddenSections.set(profileHidden(profile));
  }

  /** Muestra u oculta una sección. Ocultar nunca borra los datos detrás. */
  toggleSection(key: SectionKey): void {
    const hidden = this.hiddenSections();
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    this.sectionOrder.set(this.sectionOrder());
    this.hiddenSections.set(next);
  }

  /** Vuelve a mostrar todas las secciones, en el orden por defecto. */
  showAllSections(): void {
    this.sectionOrder.set([...DEFAULT_SECTION_ORDER]);
    this.hiddenSections.set([]);
  }

  /** Mueve una sección un puesto arriba (-1) o abajo (+1). */
  moveSection(key: SectionKey, delta: number): void {
    const list = this.sectionOrder();
    const i = list.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    this.sectionOrder.set(copy);
  }

  /** Restablece el orden de secciones al por defecto. */
  resetSectionOrder(): void {
    this.sectionOrder.set([...DEFAULT_SECTION_ORDER]);
  }

  /** Mueve una sección a una posición absoluta (arrastrar y soltar). */
  moveSectionTo(from: number, to: number): void {
    const list = this.sectionOrder();
    if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return;
    const copy = [...list];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    this.sectionOrder.set(copy);
  }

  /* ── Paletas y presets personalizados ────────────────────────────── */

  savePalette(name: string): void {
    const colors = this.customColors() ?? this.colors();
    const entry: SavedPalette = {
      id: uid('sp'),
      name: name.trim() || `Personalizada ${this.savedPalettes().length + 1}`,
      colors,
      createdAt: Date.now(),
    };
    this.savedPalettes.update((l) => [...l, entry]);
  }

  removePalette(id: string): void {
    this.savedPalettes.update((l) => l.filter((p) => p.id !== id));
    if (this.paletteId() === id) this.setPalette(DEFAULT_PALETTE_ID);
  }

  savePreset(name: string): void {
    const entry: Preset = {
      id: uid('preset'),
      name:
        name.trim() || `${this.template().name} · ${this.layout().name}`,
      templateId: this.templateId(),
      layoutId: this.layoutId(),
      paletteId: this.paletteId(),
      customColors: this.customColors(),
      createdAt: Date.now(),
    };
    this.presets.update((l) => [...l, entry]);
  }

  applyPreset(preset: Preset): void {
    this.templateId.set(preset.templateId);
    this.layoutId.set(preset.layoutId);
    this.paletteId.set(preset.paletteId);
    this.customColors.set(preset.customColors);
  }

  removePreset(id: string): void {
    this.presets.update((l) => l.filter((p) => p.id !== id));
  }

  movePreset(id: string, delta: number): void {
    this.presets.update((list) => {
      const copy = [...list];
      const i = copy.findIndex((p) => p.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= copy.length) return list;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
}
