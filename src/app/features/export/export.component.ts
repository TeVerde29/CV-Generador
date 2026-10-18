import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ExportFormat } from '../../core/models/cv-data';
import { safeFileName } from '../../core/models/labels';
import { CvStoreService } from '../../core/services/cv-store.service';
import { ExporterService, type ExportOptions } from '../../core/services/exporter.service';
import { PreviewRegistryService } from '../../core/services/preview-registry.service';
import { ToastService } from '../../core/services/toast.service';

interface FormatRow {
  id: ExportFormat;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-export',
  imports: [],
  templateUrl: './export.component.html',
  styleUrl: './export.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportComponent {
  readonly store = inject(CvStoreService);
  private readonly exporter = inject(ExporterService);
  private readonly registry = inject(PreviewRegistryService);
  private readonly toast = inject(ToastService);

  readonly formats: FormatRow[] = [
    {
      id: 'docx',
      label: 'Word (.docx)',
      hint: 'Documento editable que ya lleva tu plantilla, tu paleta y tus colores. El formato que leen mejor los filtros.',
    },
    {
      id: 'pdf',
      label: 'PDF (.pdf)',
      hint: 'Se descarga al instante con el diseño exacto que ves, y los enlaces siguen funcionando.',
    },
    {
      id: 'markdown',
      label: 'Markdown (.md)',
      hint: 'Texto estructurado, ideal para portales de empleo y perfiles técnicos.',
    },
  ];

  readonly selected = signal<Record<ExportFormat, boolean>>({
    docx: true,
    pdf: true,
    markdown: false,
  });

  readonly running = signal(false);

  readonly chosen = computed(() => this.formats.filter((f) => this.selected()[f.id]));

  readonly canExport = computed(
    () => this.chosen().length > 0 && this.store.hasContent() && !this.running(),
  );

  isSelected(id: ExportFormat): boolean {
    return this.selected()[id];
  }

  toggle(id: ExportFormat): void {
    this.selected.update((s) => ({ ...s, [id]: !s[id] }));
  }

  toggleWatermark(): void {
    this.store.showWatermark.update((v) => !v);
  }

  onWatermarkInput(event: Event): void {
    this.store.watermarkText.set((event.target as HTMLInputElement).value);
  }

  /* ── Export ──────────────────────────────────────────────────────────── */

  async exportSelected(): Promise<void> {
    const order: ExportFormat[] = ['pdf', 'docx', 'markdown'];
    const ids = order.filter((id) => this.selected()[id]);
    await this.runAll(ids);
  }

  async exportOne(id: ExportFormat): Promise<void> {
    await this.runAll([id]);
  }

  private async runAll(ids: ExportFormat[]): Promise<void> {
    if (!ids.length || this.running()) return;
    if (!this.store.hasContent()) {
      this.toast.err('Añade contenido al CV antes de exportar.');
      return;
    }
    this.running.set(true);
    let ok = 0;
    const problems: string[] = [];
    try {
      for (let i = 0; i < ids.length; i += 1) {
        const result = await this.exporter.run(ids[i], this.options());
        if (result.ok) {
          ok += 1;
          this.toast.ok(result.message);
        } else {
          problems.push(result.message);
        }
        if (i < ids.length - 1) {
          // Small gap so the browser does not treat the downloads as a flood.
          await new Promise((resolve) => setTimeout(resolve, 320));
        }
      }
    } finally {
      this.running.set(false);
    }
    if (problems.length) problems.forEach((p) => this.toast.err(p));
    if (ok === 0 && !problems.length) this.toast.err('No se pudo exportar.');
  }

  private options(): ExportOptions {
    return {
      // Hidden sections are emptied out upstream, so every format agrees with
      // the preview without each renderer knowing about profiles.
      data: this.store.documentData(),
      colors: this.store.colors(),
      paperEl: this.registry.sheet(),
      templateName: this.store.template().name,
      titles: this.store.sectionTitles(),
      design: {
        templateId: this.store.templateId(),
        layoutId: this.store.layoutId(),
        sectionOrder: this.store.sectionOrder(),
      },
      watermark: {
        enabled: this.store.showWatermark(),
        text: this.store.watermarkText(),
      },
    };
  }

  fileName(): string {
    return safeFileName(this.store.cv().personalInfo.name, 'cv');
  }
}
