import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { GenerationRecord } from '../../core/models/cv-data';
import { CvStoreService } from '../../core/services/cv-store.service';
import { GeminiService } from '../../core/services/gemini.service';
import { ToastService } from '../../core/services/toast.service';

const MIN_JOB_CONTEXT = 20;

@Component({
  selector: 'app-ai',
  imports: [],
  templateUrl: './ai.component.html',
  styleUrl: './ai.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiComponent {
  readonly store = inject(CvStoreService);
  readonly gemini = inject(GeminiService);
  private readonly toast = inject(ToastService);

  readonly MIN_JOB_CONTEXT = MIN_JOB_CONTEXT;

  readonly jobContext = signal('');
  readonly revealKey = signal(false);

  readonly jobLength = computed(() => this.jobContext().trim().length);

  readonly canRun = computed(
    () =>
      this.gemini.apiKey().trim().length > 0 &&
      this.gemini.model().trim().length > 0 &&
      this.jobLength() >= MIN_JOB_CONTEXT &&
      !this.gemini.busy() &&
      this.store.hasContent(),
  );

  readonly blocker = computed(() => {
    if (!this.store.hasContent()) return 'Rellena primero algún dato del CV.';
    if (!this.gemini.apiKey().trim()) return 'Falta tu clave de API de Gemini.';
    if (!this.gemini.model().trim()) return 'Elige un modelo.';
    if (this.jobLength() < MIN_JOB_CONTEXT) {
      return `Describe el puesto objetivo (mínimo ${MIN_JOB_CONTEXT} caracteres).`;
    }
    return '';
  });

  /* ── Inputs ──────────────────────────────────────────────────────────── */

  onKeyInput(event: Event): void {
    this.gemini.apiKey.set((event.target as HTMLInputElement).value);
  }

  onModelInput(event: Event): void {
    this.gemini.model.set((event.target as HTMLInputElement).value);
  }

  onJobInput(event: Event): void {
    this.jobContext.set((event.target as HTMLTextAreaElement).value);
  }

  clearKey(): void {
    this.gemini.apiKey.set('');
    this.gemini.connected.set(false);
  }

  /* ── Connection ──────────────────────────────────────────────────────── */

  async testConnection(): Promise<void> {
    const ok = await this.gemini.testConnection();
    if (ok) this.toast.ok('Conexión correcta con Gemini.');
    else this.toast.err(this.gemini.error() || 'No se pudo conectar.');
  }

  async refreshModels(): Promise<void> {
    await this.gemini.loadModels();
    if (this.gemini.models().length) {
      this.toast.ok(`${this.gemini.models().length} modelos disponibles.`);
    } else if (this.gemini.error()) {
      this.toast.err(this.gemini.error());
    }
  }

  /* ── Run ─────────────────────────────────────────────────────────────── */

  async optimize(): Promise<void> {
    if (!this.canRun()) return;
    const context = this.jobContext().trim();
    const before = this.store.cv();
    try {
      const result = await this.gemini.optimize(before, context);
      this.store.draft.set(result);
      this.store.recordGeneration({
        jobContext: context,
        templateId: this.store.templateId(),
        layoutId: this.store.layoutId(),
        original: before,
        optimized: result,
      });
      this.toast.ok('Propuesta lista. Revísala en la vista previa.');
    } catch (err) {
      this.toast.err(err instanceof Error ? err.message : 'No se pudo optimizar el CV.');
    }
  }

  cancel(): void {
    this.gemini.cancel();
    this.gemini.busy.set(false);
    this.gemini.phase.set('idle');
    this.toast.show('Operación cancelada.');
  }

  /* ── History ─────────────────────────────────────────────────────────── */

  restore(record: GenerationRecord): void {
    this.store.restoreGeneration(record);
    this.toast.ok('Versión restaurada desde el historial.');
  }

  remove(id: string): void {
    this.store.removeGeneration(id);
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  summarize(text: string, max = 90): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max)}…` : clean;
  }
}
