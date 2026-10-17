import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PROFICIENCIES, type Proficiency } from '../../core/models/cv-data';
import { PROFICIENCY_LABELS, safeFileName } from '../../core/models/labels';
import { SECTION_HINTS, SECTION_LABELS, type SectionKey } from '../../core/models/sections';
import { COLLECTION_LABELS, CvStoreService } from '../../core/services/cv-store.service';
import { ExporterService } from '../../core/services/exporter.service';
import { ToastService } from '../../core/services/toast.service';
import { TagInputComponent } from '../../shared/tag-input/tag-input.component';

@Component({
  selector: 'app-editor',
  imports: [TagInputComponent],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComponent {
  readonly store = inject(CvStoreService);
  private readonly exporter = inject(ExporterService);
  private readonly toast = inject(ToastService);

  readonly data = this.store.cv;
  readonly SECTION_LABELS = SECTION_LABELS;
  readonly SECTION_HINTS = SECTION_HINTS;
  readonly PROFICIENCIES = PROFICIENCIES;
  readonly proficiencyLabels = PROFICIENCY_LABELS;
  readonly collectionLabels = COLLECTION_LABELS;

  readonly isDraftPending = computed(() => this.store.draft() !== null);

  /** Which collapsible blocks are expanded. */
  private readonly open = signal<ReadonlySet<string>>(
    new Set(['personal', 'summary', 'experience']),
  );

  readonly interestDraft = signal('');

  readonly completion = computed(() => {
    const d = this.data();
    const checks = [
      d.personalInfo.name.length > 0,
      d.personalInfo.email.length > 0,
      d.summary.trim().length > 40,
      d.experience.length > 0,
      d.education.length > 0,
      d.skills.length > 0,
      d.languages.length > 0,
      d.projects.length > 0,
      d.certifications.length > 0,
      d.publications.length > 0,
      d.volunteerWork.length > 0,
      d.awards.length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  });

  /* ── Collapsible blocks ──────────────────────────────────────────────── */

  isOpen(id: string): boolean {
    return this.open().has(id);
  }

  toggle(id: string): void {
    this.open.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  expandAll(): void {
    this.open.set(
      new Set([
        'personal',
        'summary',
        'experience',
        'education',
        'skills',
        'languages',
        'projects',
        'certifications',
        'publications',
        'volunteerWork',
        'awards',
        'interests',
      ]),
    );
  }

  collapseAll(): void {
    this.open.set(new Set());
  }

  /* ── Section counts ─────────────────────────────────────────────────── */

  itemCount(key: SectionKey): number {
    const d = this.data();
    switch (key) {
      case 'summary':
        return d.summary.trim() ? 1 : 0;
      case 'interests':
        return d.interests.length;
      default:
        return (d[key] as unknown[]).length;
    }
  }

  /* ── Collection factories ───────────────────────────────────────────── */

  addExperience(): void {
    this.store.addItem('experience', (id) => ({
      id,
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
      achievements: [],
    }));
  }

  addEducation(): void {
    this.store.addItem('education', (id) => ({
      id,
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
    }));
  }

  addSkillGroup(): void {
    this.store.addItem('skills', (id) => ({ id, category: '', items: [] }));
  }

  addLanguage(): void {
    this.store.addItem('languages', (id) => ({
      id,
      language: '',
      proficiency: 'intermediate' as Proficiency,
    }));
  }

  addProject(): void {
    this.store.addItem('projects', (id) => ({
      id,
      name: '',
      description: '',
      technologies: [],
      url: '',
    }));
  }

  addCertification(): void {
    this.store.addItem('certifications', (id) => ({
      id,
      name: '',
      issuer: '',
      date: '',
      url: '',
    }));
  }

  addPublication(): void {
    this.store.addItem('publications', (id) => ({
      id,
      title: '',
      publisher: '',
      date: '',
      url: '',
      description: '',
    }));
  }

  addVolunteer(): void {
    this.store.addItem('volunteerWork', (id) => ({
      id,
      organization: '',
      role: '',
      startDate: '',
      endDate: '',
      description: '',
    }));
  }

  addAward(): void {
    this.store.addItem('awards', (id) => ({ id, title: '', issuer: '', date: '', description: '' }));
  }

  /* ── Nested list setters ────────────────────────────────────────────── */

  setAchievements(id: string, values: string[]): void {
    this.store.patchItem('experience', id, { achievements: values });
  }

  setSkillItems(id: string, values: string[]): void {
    this.store.patchItem('skills', id, { items: values });
  }

  setTechnologies(id: string, values: string[]): void {
    this.store.patchItem('projects', id, { technologies: values });
  }

  addInterest(): void {
    const value = this.interestDraft().trim();
    if (!value) return;
    const current = this.data().interests;
    if (!current.some((i) => i.toLowerCase() === value.toLowerCase())) {
      this.store.setInterests([...current, value]);
    }
    this.interestDraft.set('');
  }

  onInterestInput(event: Event): void {
    this.interestDraft.set((event.target as HTMLInputElement).value);
  }

  removeInterest(index: number): void {
    this.store.setInterests(this.data().interests.filter((_, i) => i !== index));
  }

  /* ── Section order ──────────────────────────────────────────────────── */

  orderIndex(key: SectionKey): number {
    return this.store.sectionOrder().indexOf(key);
  }

  isFirst(key: SectionKey): boolean {
    return this.orderIndex(key) === 0;
  }

  isLast(key: SectionKey): boolean {
    return this.orderIndex(key) === this.store.sectionOrder().length - 1;
  }

  /* ── Whole-document actions ─────────────────────────────────────────── */

  loadSample(): void {
    this.store.loadSample();
    this.toast.ok('Datos de ejemplo cargados.');
  }

  clearAll(): void {
    if (!confirm('¿Vaciar todo el contenido del CV? Esta acción no se puede deshacer.')) return;
    this.store.clearAll();
    this.toast.show('CV vaciado.');
  }

  exportJson(): void {
    this.exporter.exportJson(this.data(), safeFileName(this.data().personalInfo.name, 'cv'));
    this.toast.ok('Copia de seguridad descargada (.json).');
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.store.setData(JSON.parse(String(reader.result)));
        this.store.save();
        this.toast.ok('Datos importados correctamente.');
      } catch {
        this.toast.err('El archivo no contiene un JSON válido.');
      }
      input.value = '';
    };
    reader.onerror = () => this.toast.err('No se pudo leer el archivo.');
    reader.readAsText(file);
  }

  applyDraft(): void {
    this.store.applyDraft();
    this.toast.ok('Se aplicó la propuesta de la IA.');
  }

  discardDraft(): void {
    this.store.discardDraft();
    this.toast.show('Propuesta descartada.');
  }
}
