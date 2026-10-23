import { Injectable, computed, effect, signal, inject } from '@angular/core';
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
  ReferenceItem,
  SavedPalette,
  SkillGroup,
  CustomSectionItem,
  VolunteerItem,
} from '../models/cv-data';
import { SECTION_TITLES } from '../models/labels';
import { SUMMARY_MAX_LENGTH } from '../models/cv-data';
import {
  parseJson,
  stringifyJson,
  type JsonDesign,
} from '../models/json-payload';
import {
  normalizeHiddenSections,
  normalizeSectionOrder,
} from '../models/json-payload';
import {
  ALL_SECTION_KEYS,
  DEFAULT_SECTION_ORDER,
  type SectionKey,
} from '../models/sections';
import { CvHistoryService, type Snapshot } from './cv-history.service';
import { CvPersistenceService, STORAGE_KEYS } from './cv-persistence.service';
import { CvDesignService } from './cv-design.service';

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
  references: ReferenceItem;
  customSections: CustomSectionItem;
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
  references: { singular: 'referencia', plural: 'referencias' },
  customSections: { singular: 'entrada', plural: 'entradas' },
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

/** A link field, trimmed, or `undefined` when it is empty or not a string. */
const asLink = (v: unknown): string | undefined => {
  const link = typeof v === 'string' ? v.trim() : '';
  return link || undefined;
};

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
    projects: arr<ProjectItem & { url?: string }>(d['projects']).map((raw) => {
      const { url, ...rest } = (raw ?? {}) as ProjectItem & { url?: string };
      return {
        ...rest,
        technologies: arr<string>(rest.technologies),
        demoUrl: asLink(rest.demoUrl) || asLink(url) || '',
        repoUrl: asLink(rest.repoUrl) || '',
      };
    }),
    certifications: arr<CertificationItem>(d['certifications']),
    publications: arr<PublicationItem>(d['publications']),
    volunteerWork: arr<VolunteerItem>(d['volunteerWork']),
    awards: arr<AwardItem>(d['awards']),
    interests: arr<string>(d['interests']),
    references: arr<ReferenceItem>(d['references']),
    customSections: arr<CustomSectionItem>(d['customSections']).map((x) => ({
      ...x,
      items: arr<string>(x?.items),
    })),
  };
}

/* ── Service ───────────────────────────────────────────────────────────── */

@Injectable({ providedIn: 'root' })
export class CvStoreService {
  private readonly history = inject(CvHistoryService);
  private readonly persistence = inject(CvPersistenceService);
  private readonly design = inject(CvDesignService);

  /* ── Core CV state ─────────────────────────────────────────────────── */

  readonly cv = signal<CVData>(emptyCVData());
  /** Texto del anuncio para el análisis de palabras clave. */
  readonly jobOffer = signal('');
  /** Serialised state at the last successful save; `dirty` derives from it. */
  private readonly savedSnapshot = signal<string>('');

  /** Copia en memoria del CV antes de empezar de cero. */
  private lastSaved: CVData | null = null;

  /* ── Delegated design signals (misma API pública, respaldo en CvDesignService) ─── */

  readonly templateId = this.design.templateId;
  readonly layoutId = this.design.layoutId;
  readonly paletteId = this.design.paletteId;
  readonly customColors = this.design.customColors;
  readonly presets = this.design.presets;
  readonly savedPalettes = this.design.savedPalettes;
  readonly sectionOrder = this.design.sectionOrder;
  readonly hiddenSections = this.design.hiddenSections;
  readonly photoShape = this.design.photoShape;
  readonly showWatermark = this.design.showWatermark;
  readonly watermarkText = this.design.watermarkText;
  /** Marca de tiempo del último guardado exitoso. */
  readonly lastSavedAt = signal<number | null>(null);

  readonly template = this.design.template;
  readonly layout = this.design.layout;
  readonly palette = this.design.palette;
  readonly colors = this.design.colors;
  readonly activeProfileId = this.design.activeProfileId;
  readonly profile = this.design.profile;
  readonly sectionTitles = this.design.sectionTitles;
  readonly hasSidebar = this.design.hasSidebar;

  /** El CV tal como lo ve el documento: secciones desactivadas se vacían. */
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

  /** ¿Hay pasos en el historial para deshacer? */
  readonly canUndo = computed(() => this.history.canUndo());

  /** ¿Hay pasos en el historial para rehacer? */
  readonly canRedo = computed(() => this.history.canRedo());

  /** Todo lo que se persiste, como cadena comparable. */
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

  /** True cuando hay cambios sin escribir en storage. */
  readonly dirty = computed(() => this.snapshot() !== this.savedSnapshot());

  /** Todo el estado como JSON, listo para descargar. */
  readonly json = computed(() => stringifyJson(this.cv(), this.designState()));

  /** El diseño tal como viaja en el JSON. */
  readonly designState = computed<JsonDesign>(() => ({
    templateId: this.templateId(),
    layoutId: this.layoutId(),
    paletteId: this.paletteId(),
    customColors: this.customColors(),
    sectionOrder: this.sectionOrder(),
    hiddenSections: this.hiddenSections(),
    photoShape: this.photoShape(),
    showWatermark: this.showWatermark(),
    watermarkText: this.watermarkText(),
  }));

  constructor() {
    this.restore();
    // Autosave (debounced) para que un refresco nunca pierda el trabajo.
    let t: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      this.snapshot();
      if (t) clearTimeout(t);
      t = setTimeout(() => this.save(), 600);
    });
  }

  /* ── Undo / redo (delega en CvHistoryService) ──────────────────────── */

  undo(): void {
    this.history.setCurrent(this.cv(), this.sectionOrder(), this.hiddenSections());
    const snap = this.history.undo();
    if (!snap) return;
    this.cv.set(snap.cv);
    this.sectionOrder.set([...snap.order]);
    this.hiddenSections.set([...(snap.hidden ?? [])]);
  }

  redo(): void {
    this.history.setCurrent(this.cv(), this.sectionOrder(), this.hiddenSections());
    const snap = this.history.redo();
    if (!snap) return;
    this.cv.set(snap.cv);
    this.sectionOrder.set([...snap.order]);
    this.hiddenSections.set([...(snap.hidden ?? [])]);
  }

  /** Graba un snapshot antes de mutar el CV. */
  private pushHistory(cv: CVData): void {
    this.history.setCurrent(cv, this.sectionOrder(), this.hiddenSections());
    this.history.push({ cv, order: this.sectionOrder(), hidden: this.hiddenSections() });
  }

  private commit(next: CVData): void {
    this.pushHistory(next);
    this.cv.set(next);
  }

  /* ── Persistence (delega en CvPersistenceService) ──────────────────── */

  restore(): void {
    const loaded = this.persistence.restore();
    if (!loaded) {
      this.history.clear();
      this.savedSnapshot.set(this.snapshot());
      return;
    }
    this.cv.set(loaded.data);
    if (loaded.design) this.design.applyDesign(loaded.design);
    this.presets.set(loaded.presets as Preset[]);
    this.savedPalettes.set(loaded.palettes as SavedPalette[]);
    this.jobOffer.set(loaded.offer);
    this.history.clear();
    this.savedSnapshot.set(this.snapshot());
  }

  save(): void {
    this.persistence.save({
      data: this.cv(),
      design: this.designState(),
      presets: this.presets(),
      palettes: this.savedPalettes(),
      offer: this.jobOffer(),
    });
    this.lastSavedAt.set(Date.now());
    this.savedSnapshot.set(this.snapshot());
  }

  /* ── JSON ─────────────────────────────────────────────────────────────── */

  importJson(raw: string): void {
    const { data, design } = parseJson(raw);
    this.commit(normalizeCVData(data));
    this.design.applyDesign(design);
  }

  /* ── CV data mutation ──────────────────────────────────────────────── */

  private mutate(mutator: (draft: CVData) => void): void {
    const next = structuredClone(this.cv());
    mutator(next);
    this.commit(next);
  }

  clearAll(): void {
    this.commit(emptyCVData());
  }

  /** Empieza de cero: guarda lo que había en memoria para «continuar después». */
  startFresh(): void {
    if (this.hasContent()) {
      this.lastSaved = structuredClone(this.cv());
    }
    this.commit(emptyCVData());
  }

  /** Vuelve al CV que había antes de empezar de cero, si lo había. */
  restoreLastSaved(): void {
    if (!this.lastSaved) return;
    this.commit(structuredClone(this.lastSaved));
    this.lastSaved = null;
  }

  /** ¿Hay algo que continuar? O un CV escrito, o el apartado al empezar de cero. */
  canContinueSaved(): boolean {
    return this.hasContent() || this.lastSaved !== null;
  }

  loadSample(): void {
    this.commit(normalizeCVData(structuredClone(SAMPLE_CV_DATA)));
  }

  setPersonal(patch: Partial<CVData['personalInfo']>): void {
    this.mutate((d) => Object.assign(d.personalInfo, patch));
  }

  /** Añade o quita la foto opcional (un data URL ya recortado). */
  setPhoto(photo: string | undefined): void {
    this.mutate((d) => {
      if (photo) d.personalInfo.photo = photo;
      else delete d.personalInfo.photo;
    });
  }

  setSummary(value: string): void {
    this.mutate((d) => {
      // El cupo también se aplica al pegar, no solo al teclear.
      d.summary = value.slice(0, SUMMARY_MAX_LENGTH);
    });
  }

  setInterests(values: string[]): void {
    this.mutate((d) => {
      d.interests = values;
    });
  }

  setJobOffer(value: string): void {
    this.jobOffer.set(value);
  }

  addItem<K extends CollectionKey>(
    key: K,
    factory: (id: string) => CollectionMap[K],
  ): string {
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

  /** Mueve un ítem un puesto arriba (-1) o abajo (+1) dentro de su sección. */
  moveItem<K extends CollectionKey>(key: K, id: string, delta: number): void {
    this.mutate((d) => {
      const list = d[key] as unknown as CollectionMap[K][];
      const i = list.findIndex((x) => (x as { id: string }).id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    });
  }

  /** Mueve un ítem a un índice absoluto (drag & drop usa posiciones). */
  moveItemTo<K extends CollectionKey>(key: K, from: number, to: number): void {
    this.mutate((d) => {
      const list = d[key] as unknown as CollectionMap[K][];
      if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
    });
  }

  /* ── Design setters (delegados en CvDesignService) ─────────────────── */

  setTemplate(id: string): void {
    this.design.setTemplate(id);
  }

  setLayout(id: LayoutOption['id']): void {
    this.design.setLayout(id);
  }

  setPalette(id: string): void {
    this.design.setPalette(id);
  }

  setCustomColors(colors: PaletteColors): void {
    this.design.setCustomColors(colors);
  }

  setPhotoShape(shape: 'square' | 'circle'): void {
    this.design.setPhotoShape(shape);
  }

  /* ── Section order ─────────────────────────────────────────────────── */

  /** Mueve una sección un puesto arriba (-1) o abajo (+1). */
  moveSection(key: SectionKey, delta: number): void {
    this.design.moveSection(key, delta);
  }

  /** Restablece el orden de secciones al por defecto. */
  resetSectionOrder(): void {
    this.design.resetSectionOrder();
  }

  /** Mueve una sección a una posición absoluta (drag & drop). */
  moveSectionTo(from: number, to: number): void {
    this.design.moveSectionTo(from, to);
  }

  /* ── Perfiles y visibilidad ────────────────────────────────────────── */

  /** Aplica un perfil: su orden de secciones, su visibilidad y sus títulos. */
  applyProfile(id: string): void {
    this.design.applyProfile(id);
  }

  isSectionHidden(key: SectionKey): boolean {
    return this.hiddenSections().includes(key);
  }

  /** Muestra u oculta una sección. Ocultar nunca borra los datos detrás. */
  toggleSection(key: SectionKey): void {
    this.design.toggleSection(key);
  }

  /** Vuelve a mostrar todas las secciones, en el orden por defecto. */
  showAllSections(): void {
    this.design.showAllSections();
  }

  /* ── Paletas y presets personalizados (delegados en CvDesignService) ── */

  savePalette(name: string): void {
    this.design.savePalette(name);
  }

  removePalette(id: string): void {
    this.design.removePalette(id);
  }

  savePreset(name: string): void {
    this.design.savePreset(name);
  }

  applyPreset(preset: Preset): void {
    this.design.applyPreset(preset);
  }

  removePreset(id: string): void {
    this.design.removePreset(id);
  }

  movePreset(id: string, delta: number): void {
    this.design.movePreset(id, delta);
  }
}
