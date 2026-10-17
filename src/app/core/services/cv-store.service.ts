import { Injectable, computed, effect, signal } from '@angular/core';
import {
  DEFAULT_LAYOUT_ID,
  DEFAULT_PALETTE_ID,
  DEFAULT_TEMPLATE_ID,
  LAYOUTS,
  PALETTES,
  SAMPLE_CV_DATA,
  TEMPLATES,
  emptyCVData,
} from '../models/catalog';
import type {
  AwardItem,
  CVData,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  LayoutOption,
  PaletteColors,
  PaletteOption,
  Preset,
  ProjectItem,
  PublicationItem,
  SavedPalette,
  SkillGroup,
  VolunteerItem,
} from '../models/cv-data';
import { SECTION_TITLES } from '../models/labels';
import { PROFILES, findProfile, profileFullOrder, profileHidden } from '../models/profiles';
import { ALL_SECTION_KEYS, DEFAULT_SECTION_ORDER, type SectionKey } from '../models/sections';

/* ── Collection plumbing ───────────────────────────────────────────────── */

interface CollectionMap {
  experience: ExperienceItem;
  education: EducationItem;
  skills: SkillGroup;
  languages: LanguageItem;
  projects: ProjectItem;
  certifications: CertificationItem;
  publications: PublicationItem;
  volunteerWork: VolunteerItem;
  awards: AwardItem;
}

export type CollectionKey = keyof CollectionMap;

export const COLLECTION_LABELS: Record<CollectionKey, { singular: string; plural: string }> = {
  experience: { singular: 'puesto', plural: 'puestos' },
  education: { singular: 'estudio', plural: 'estudios' },
  skills: { singular: 'grupo', plural: 'grupos' },
  languages: { singular: 'idioma', plural: 'idiomas' },
  projects: { singular: 'proyecto', plural: 'proyectos' },
  certifications: { singular: 'certificación', plural: 'certificaciones' },
  publications: { singular: 'publicación', plural: 'publicaciones' },
  volunteerWork: { singular: 'voluntariado', plural: 'voluntariados' },
  awards: { singular: 'reconocimiento', plural: 'reconocimientos' },
};

const KEY = {
  data: 'cvgen.data',
  design: 'cvgen.design',
  presets: 'cvgen.presets',
  palettes: 'cvgen.palettes',
  offer: 'cvgen.offer',
};

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Guarantees every section exists so the preview never crashes on odd input. */
export function normalizeCVData(input: unknown): CVData {
  const d = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const base = emptyCVData();
  return {
    ...base,
    ...d,
    personalInfo: { ...base.personalInfo, ...(d['personalInfo'] ?? {}) },
    summary: typeof d['summary'] === 'string' ? d['summary'] : '',
    experience: arr<ExperienceItem>(d['experience']).map((x) => ({
      ...x,
      achievements: arr<string>(x?.achievements),
    })),
    education: arr<EducationItem>(d['education']),
    skills: arr<SkillGroup>(d['skills']).map((x) => ({ ...x, items: arr<string>(x?.items) })),
    languages: arr<LanguageItem>(d['languages']),
    projects: arr<ProjectItem>(d['projects']).map((x) => ({
      ...x,
      technologies: arr<string>(x?.technologies),
    })),
    certifications: arr<CertificationItem>(d['certifications']),
    publications: arr<PublicationItem>(d['publications']),
    volunteerWork: arr<VolunteerItem>(d['volunteerWork']),
    awards: arr<AwardItem>(d['awards']),
    interests: arr<string>(d['interests']),
  };
}

/* ── Service ───────────────────────────────────────────────────────────── */

/**
 * Everything a single undo step has to restore. The layout of the document is
 * part of the user's work, so the section order travels with the data.
 */
interface Snapshot {
  cv: CVData;
  order: SectionKey[];
  hidden: SectionKey[];
}

@Injectable({ providedIn: 'root' })
export class CvStoreService {
  /* State */
  readonly cv = signal<CVData>(emptyCVData());
  readonly templateId = signal<string>(DEFAULT_TEMPLATE_ID);
  readonly layoutId = signal<LayoutOption['id']>(DEFAULT_LAYOUT_ID);
  readonly paletteId = signal<string>(DEFAULT_PALETTE_ID);
  readonly customColors = signal<PaletteColors | null>(null);
  readonly presets = signal<Preset[]>([]);
  readonly savedPalettes = signal<SavedPalette[]>([]);
  /** Order of the sections in the rendered document. */
  readonly sectionOrder = signal<SectionKey[]>([...DEFAULT_SECTION_ORDER]);
  /** Sections turned off: they keep their data but leave the document. */
  readonly hiddenSections = signal<SectionKey[]>([]);
  /** Frame of the photo when the CV carries one. */
  readonly photoShape = signal<'square' | 'circle'>('square');
  /** Optional footer line on the exported documents (off by default). */
  readonly showWatermark = signal(false);
  readonly watermarkText = signal('');
  /** Text of the job offer used for the keyword analysis. */
  readonly jobOffer = signal('');
  readonly lastSavedAt = signal<number | null>(null);
  /** Serialised state at the last successful save; `dirty` derives from it. */
  private readonly savedSnapshot = signal<string>('');

  /* Derived */
  readonly template = computed(
    () => TEMPLATES.find((t) => t.id === this.templateId()) ?? TEMPLATES[0],
  );
  readonly layout = computed(
    () => LAYOUTS.find((l) => l.id === this.layoutId()) ?? LAYOUTS[0],
  );
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
  readonly colors = computed<PaletteColors>(
    () => this.palette()?.colors ?? PALETTES[0].colors,
  );

  /* ── CV profile (section layout) ─────────────────────────────────────── */

  /**
   * Which profile the current layout corresponds to. Derived rather than
   * stored, so hand-tuning the order can never leave the selector lying: as
   * soon as the order stops matching a profile, the selector says so.
   */
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

  /** The matched profile, or `null` when the layout is hand-made. */
  readonly profile = computed(() => findProfile(this.activeProfileId()) ?? null);

  /** Titles printed in the document; a profile may override the defaults. */
  readonly sectionTitles = computed<Record<SectionKey, string>>(() => ({
    ...SECTION_TITLES,
    ...(this.profile()?.titles ?? {}),
  }));

  /**
   * The CV exactly as the document sees it: sections the profile turned off
   * are emptied out, so the preview, the PDF, the Word file and the Markdown
   * all agree without each renderer having to know about the profile.
   */
  readonly documentData = computed<CVData>(() => {
    const hidden = this.hiddenSections();
    if (!hidden.length) return this.cv();
    const d = structuredClone(this.cv());
    const bag = d as unknown as Record<string, unknown>;
    for (const key of hidden) {
      if (key === 'summary') d.summary = '';
      else bag[key] = [];
    }
    return d;
  });

  readonly hasContent = computed(() => {
    const c = this.cv();
    return Boolean(
      c.personalInfo.name ||
        c.summary ||
        c.experience.length ||
        c.education.length ||
        c.skills.length,
    );
  });

  /** Everything that gets persisted, as a comparable string. */
  private readonly snapshot = computed(() =>
    JSON.stringify({
      data: this.cv(),
      templateId: this.templateId(),
      layoutId: this.layoutId(),
      paletteId: this.paletteId(),
      customColors: this.customColors(),
      presets: this.presets(),
      savedPalettes: this.savedPalettes(),
      sectionOrder: this.sectionOrder(),
      hiddenSections: this.hiddenSections(),
      photoShape: this.photoShape(),
      showWatermark: this.showWatermark(),
      watermarkText: this.watermarkText(),
      jobOffer: this.jobOffer(),
    }),
  );

  /** True when there are changes that have not been written to storage yet. */
  readonly dirty = computed(() => this.snapshot() !== this.savedSnapshot());

  constructor() {
    this.restore();
    // Autosave (debounced) so a refresh never loses work.
    let t: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      // Any persisted change re-schedules the debounced autosave. The save
      // itself runs from a timer, outside the reactive context.
      this.snapshot();
      if (t) clearTimeout(t);
      t = setTimeout(() => this.save(), 600);
    });
  }

  /* ── Undo / redo ─────────────────────────────────────────────────────── */

  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private lastPushAt = 0;
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  /** The current state, ready to be recorded. */
  private state(): Snapshot {
    return { cv: this.cv(), order: this.sectionOrder(), hidden: this.hiddenSections() };
  }

  /**
   * Records the state before a change. Rapid edits (typing, or the many small
   * moves a drag emits) coalesce into a single step, so one undo does not walk
   * back character by character or swap by swap.
   */
  private pushHistory(before: Snapshot): void {
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

  private commit(next: CVData): void {
    this.pushHistory(this.state());
    this.cv.set(next);
  }

  /**
   * Section order and visibility are not CV data, but they are still the
   * user's work, so they go through the same history. A no-op change records
   * nothing.
   */
  private commitLayout(order: SectionKey[], hidden: SectionKey[]): void {
    const curOrder = this.sectionOrder();
    const curHidden = this.hiddenSections();
    const unchanged =
      order.length === curOrder.length &&
      order.every((k, i) => k === curOrder[i]) &&
      hidden.length === curHidden.length &&
      hidden.every((k, i) => k === curHidden[i]);
    if (unchanged) return;
    this.pushHistory(this.state());
    this.sectionOrder.set(order);
    this.hiddenSections.set(hidden);
  }

  /** Reorders the sections, leaving visibility alone. */
  private commitSections(next: SectionKey[]): void {
    this.commitLayout(next, this.hiddenSections());
  }

  private apply(snapshot: Snapshot): void {
    this.cv.set(snapshot.cv);
    this.sectionOrder.set([...snapshot.order]);
    this.hiddenSections.set([...(snapshot.hidden ?? [])]);
  }

  undo(): void {
    const previous = this.past.pop();
    if (!previous) return;
    this.future.push(structuredClone(this.state()));
    this.apply(previous);
    this.lastPushAt = 0;
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(structuredClone(this.state()));
    this.apply(next);
    this.lastPushAt = 0;
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }

  /* ── Persistence ─────────────────────────────────────────────────────── */

  restore(): void {
    this.cv.set(normalizeCVData(safeParse(localStorage.getItem(KEY.data), emptyCVData())));
    const design = safeParse<Record<string, unknown> | null>(
      localStorage.getItem(KEY.design),
      null,
    );
    if (design) {
      if (typeof design['templateId'] === 'string') this.templateId.set(design['templateId']);
      if (typeof design['layoutId'] === 'string') {
        this.layoutId.set(design['layoutId'] as LayoutOption['id']);
      }
      if (typeof design['paletteId'] === 'string') this.paletteId.set(design['paletteId']);
      const cc = design['customColors'];
      this.customColors.set(
        cc && typeof cc === 'object' ? (cc as PaletteColors) : null,
      );
      const so = design['sectionOrder'];
      if (Array.isArray(so)) {
        const known = so.filter((k): k is SectionKey =>
          ALL_SECTION_KEYS.includes(k as SectionKey),
        );
        const missing = ALL_SECTION_KEYS.filter((k) => !known.includes(k));
        this.sectionOrder.set([...known, ...missing]);
      }
      const hs = design['hiddenSections'];
      if (Array.isArray(hs)) {
        this.hiddenSections.set(
          hs.filter((k): k is SectionKey => ALL_SECTION_KEYS.includes(k as SectionKey)),
        );
      }
      if (design['photoShape'] === 'circle' || design['photoShape'] === 'square') {
        this.photoShape.set(design['photoShape']);
      }
      this.showWatermark.set(design['showWatermark'] === true);
      if (typeof design['watermarkText'] === 'string') {
        this.watermarkText.set(design['watermarkText']);
      }
    }
    this.presets.set(safeParse<Preset[]>(localStorage.getItem(KEY.presets), []));
    this.savedPalettes.set(safeParse<SavedPalette[]>(localStorage.getItem(KEY.palettes), []));
    this.jobOffer.set(localStorage.getItem(KEY.offer) ?? '');
    this.past = [];
    this.future = [];
    this.canUndo.set(false);
    this.canRedo.set(false);
    this.savedSnapshot.set(this.snapshot());
  }

  save(): void {
    try {
      localStorage.setItem(KEY.data, JSON.stringify(this.cv()));
      localStorage.setItem(
        KEY.design,
        JSON.stringify({
          templateId: this.templateId(),
          layoutId: this.layoutId(),
          paletteId: this.paletteId(),
          customColors: this.customColors(),
          sectionOrder: this.sectionOrder(),
          hiddenSections: this.hiddenSections(),
          photoShape: this.photoShape(),
          showWatermark: this.showWatermark(),
          watermarkText: this.watermarkText(),
        }),
      );
      localStorage.setItem(KEY.presets, JSON.stringify(this.presets()));
      localStorage.setItem(KEY.palettes, JSON.stringify(this.savedPalettes()));
      localStorage.setItem(KEY.offer, this.jobOffer());
      this.lastSavedAt.set(Date.now());
      this.savedSnapshot.set(this.snapshot());
    } catch (err) {
      console.warn('[cv-store] No se pudo guardar:', err);
    }
  }

  /* ── CV data mutation ────────────────────────────────────────────────── */

  private mutate(mutator: (draft: CVData) => void): void {
    const next = structuredClone(this.cv());
    mutator(next);
    this.commit(next);
  }

  setData(data: unknown): void {
    this.commit(normalizeCVData(data));
  }

  clearAll(): void {
    this.commit(emptyCVData());
  }

  loadSample(): void {
    this.commit(normalizeCVData(structuredClone(SAMPLE_CV_DATA)));
  }

  setPersonal(patch: Partial<CVData['personalInfo']>): void {
    this.mutate((d) => Object.assign(d.personalInfo, patch));
  }

  /** Adds or removes the optional photo (a data URL, already cropped). */
  setPhoto(photo: string | undefined): void {
    this.mutate((d) => {
      if (photo) d.personalInfo.photo = photo;
      else delete d.personalInfo.photo;
    });
  }

  setPhotoShape(shape: 'square' | 'circle'): void {
    this.photoShape.set(shape);
  }

  setSummary(value: string): void {
    this.mutate((d) => {
      d.summary = value;
    });
  }

  setInterests(values: string[]): void {
    this.mutate((d) => {
      d.interests = values;
    });
  }

  /* ── Job offer (keyword analysis) ────────────────────────────────────── */

  /**
   * The offer the CV is being compared against. It sits outside the CV and
   * outside the undo history: it is reference material, not document content.
   */
  setJobOffer(value: string): void {
    this.jobOffer.set(value);
  }

  addItem<K extends CollectionKey>(key: K, factory: (id: string) => CollectionMap[K]): string {
    const id = uid(key);
    const item = factory(id);
    this.mutate((d) => {
      (d[key] as unknown as CollectionMap[K][]).push(item);
    });
    return id;
  }

  patchItem<K extends CollectionKey>(
    key: K,
    id: string,
    patch: Partial<CollectionMap[K]>,
  ): void {
    this.mutate((d) => {
      const list = d[key] as unknown as CollectionMap[K][];
      const i = list.findIndex((x) => (x as { id: string }).id === id);
      if (i >= 0) list[i] = { ...list[i], ...patch };
    });
  }

  removeItem<K extends CollectionKey>(key: K, id: string): void {
    this.mutate((d) => {
      const list = d[key] as unknown as CollectionMap[K][];
      const i = list.findIndex((x) => (x as { id: string }).id === id);
      if (i >= 0) list.splice(i, 1);
    });
  }

  /** Moves an item up (-1) or down (+1) within its section. */
  moveItem<K extends CollectionKey>(key: K, id: string, delta: number): void {
    this.mutate((d) => {
      const list = d[key] as unknown as CollectionMap[K][];
      const i = list.findIndex((x) => (x as { id: string }).id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    });
  }

  /**
   * Moves an item to an absolute index. Drag & drop works in positions rather
   * than steps, so it needs a direct move instead of repeated swaps.
   */
  moveItemTo<K extends CollectionKey>(key: K, from: number, to: number): void {
    this.mutate((d) => {
      const list = d[key] as unknown as CollectionMap[K][];
      if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
    });
  }

  /* ── Design ──────────────────────────────────────────────────────────── */

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

  /* ── Section order ───────────────────────────────────────────────────── */

  /** Moves a section up (-1) or down (+1) in the document. */
  moveSection(key: SectionKey, delta: number): void {
    const list = this.sectionOrder();
    const i = list.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    this.commitSections(copy);
  }

  resetSectionOrder(): void {
    this.commitSections([...DEFAULT_SECTION_ORDER]);
  }

  /** Moves a section to an absolute position. Used by drag & drop. */
  moveSectionTo(from: number, to: number): void {
    const list = this.sectionOrder();
    if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return;
    const copy = [...list];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    this.commitSections(copy);
  }

  /* ── Perfiles y visibilidad ──────────────────────────────────────────── */

  /** Applies a profile: its section order, its visibility and its titles. */
  applyProfile(id: string): void {
    const profile = findProfile(id);
    if (!profile) return;
    this.commitLayout(profileFullOrder(profile), profileHidden(profile));
  }

  isSectionHidden(key: SectionKey): boolean {
    return this.hiddenSections().includes(key);
  }

  /** Shows or hides one section. Hiding never deletes the data behind it. */
  toggleSection(key: SectionKey): void {
    const hidden = this.hiddenSections();
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    this.commitLayout(this.sectionOrder(), next);
  }

  /** Puts every section back, in the default order. */
  showAllSections(): void {
    this.commitLayout([...DEFAULT_SECTION_ORDER], []);
  }

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
