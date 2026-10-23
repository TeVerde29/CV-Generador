import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CvStoreService } from '../../core/services/cv-store.service';
import { PreviewRegistryService } from '../../core/services/preview-registry.service';
import { ToastService } from '../../core/services/toast.service';
import { safeFileName } from '../../core/models/labels';
import { CvDocumentComponent } from './cv-document/cv-document.component';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

@Component({
  selector: 'app-preview',
  imports: [CvDocumentComponent],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(CvStoreService);
  private readonly registry = inject(PreviewRegistryService);
  private readonly toast = inject(ToastService);

  readonly data = this.store.documentData;
  readonly templateId = this.store.templateId;
  readonly layoutId = this.store.layoutId;
  readonly colors = this.store.colors;
  readonly template = this.store.template;
  readonly layout = this.store.layout;
  readonly sectionOrder = this.store.sectionOrder;
  readonly showWatermark = this.store.showWatermark;
  readonly watermarkText = this.store.watermarkText;
  readonly titles = this.store.sectionTitles;
  readonly photoShape = this.store.photoShape;

  /** Secciones ocultas: se pasan al documento para que no se rendericen en el PDF ni en la pantalla. */
  readonly hiddenSections = this.store.hiddenSections;

  readonly zoom = signal(80);
  /** Cuántas páginas A4 ocupa el currículum al alto natural del papel. */
  readonly pages = signal(0);
  /** Vista previa o JSON: el mismo currículum, en texto o en papel. */
  readonly mode = signal<'preview' | 'json'>('preview');
  /** El estado completo como JSON (solo lectura). */
  readonly json = this.store.json;
  /** ¿Está el JSON en modo edición? */
  readonly editingJson = signal(false);
  /** Texto JSON que el usuario está editando. */
  readonly editableJson = signal('');

  private readonly holder = viewChild.required<ElementRef<HTMLElement>>('holder');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private observer?: ResizeObserver;

  constructor() {
    // Re-cuenta si el contenido del CV cambia (texto, foto, orden…). El
    // efecto se crea en el constructor porque necesita un contexto de
    // inyección, y corre antes de que el DOM refleje el cambio: por eso la
    // medida se pide para el siguiente fotograma, cuando el papel ya tiene
    // su alto real.
    effect(() => {
      this.data();
      this.templateId();
      this.layoutId();
      requestAnimationFrame(() => this.measurePages());
    });
  }

  ngAfterViewInit(): void {
    const el = this.viewport().nativeElement;
    this.observer = new ResizeObserver(() => {
      /* keep the current zoom, but make sure the paper stays centred */
      this.measurePages();
    });
    this.observer.observe(el);
    this.fitWidth();
    this.measurePages();
    this.registry.register(this.getSheetElement());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.registry.clear();
  }

  /** The rendered A4 sheet, handed to the exporter for the PDF. */
  getSheetElement(): HTMLElement | null {
    return this.holder().nativeElement.querySelector<HTMLElement>('.cv-sheet');
  }

  setZoom(value: number): void {
    this.zoom.set(clamp(Math.round(value), 30, 150));
  }
  zoomIn(): void {
    this.setZoom(this.zoom() + 10);
  }
  zoomOut(): void {
    this.setZoom(this.zoom() - 10);
  }
  resetZoom(): void {
    this.setZoom(80);
  }

  /** A4 is 210 x 297 mm, and a CSS pixel is 1/96 inch: 1 mm = 3,7795 px. */
  private readonly A4_WIDTH_PX = (210 * 96) / 25.4; //  793,7
  private readonly A4_HEIGHT_PX = (297 * 96) / 25.4; // 1122,5

  /**
   * ¿Hay algo que imprimir? Un currículum en blanco no ocupa ninguna página,
   * aunque el papel tenga alto mínimo para poder imprimirlo.
   */
  private isEmpty(): boolean {
    const d = this.data();
    const p = d.personalInfo;
    return !(
      p.name ||
      p.title ||
      p.photo ||
      p.email ||
      p.phone ||
      p.location ||
      d.summary ||
      d.experience.length ||
      d.education.length ||
      d.skills.length ||
      d.languages.length ||
      d.projects.length ||
      d.certifications.length ||
      d.publications.length ||
      d.volunteerWork.length ||
      d.awards.length ||
      d.interests.length ||
      d.references.length ||
      d.customSections.length
    );
  }

  /** Cuántas páginas A4 ocuparía el currículum impreso. */
  measurePages(): void {
    if (this.isEmpty()) {
      this.pages.set(0);
      return;
    }
    const sheet = this.getSheetElement();
    if (!sheet) return;
    const factor = this.zoom() / 100 || 1;
    const naturalHeight = sheet.offsetHeight / factor;
    // Sin medidas no hay cifra: el lienzo está oculto y no se puede saber.
    if (naturalHeight <= 0) return;
    // `offsetHeight` viene redondeado, así que un margen de dos píxeles evita
    // que una página exacta se cuente como dos.
    this.pages.set(Math.max(1, Math.ceil((naturalHeight - 2) / this.A4_HEIGHT_PX)));
  }

  /** A4 is 210mm ≈ 793.7 CSS px at 96 dpi. */
  fitWidth(): void {
    const available = this.viewport().nativeElement.clientWidth - 56;
    if (available <= 0) return;
    this.setZoom((available / this.A4_WIDTH_PX) * 100);
    this.measurePages();
  }

  /* ── JSON ────────────────────────────────────────────────────────────── */

  /** Cambia entre el papel y el JSON. */
  setMode(mode: 'preview' | 'json'): void {
    this.mode.set(mode);
  }

  /** Copia el JSON al portapapeles. */
  async copyJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.json());
      this.toast.ok('JSON copiado.');
    } catch {
      this.toast.err('El navegador no permitió copiar al portapapeles.');
    }
  }

  /** Descarga el JSON como archivo. */
  downloadJson(): void {
    const name = safeFileName(this.store.cv().personalInfo.name, 'cv');
    const blob = new Blob([this.json()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    this.toast.ok(`JSON descargado (${name}.json).`);
  }

  /** Importa un archivo .json y vuelve al papel. */
  onJsonFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.store.importJson(String(reader.result ?? ''));
        this.toast.ok('Currículum importado.');
      } catch (err) {
        this.toast.err(
          err instanceof Error ? err.message : 'El archivo no es un JSON válido.',
        );
      }
    };
    reader.onerror = () => this.toast.err('No se pudo leer el archivo.');
    reader.readAsText(file);
  }

  /* ── Edición JSON ────────────────────────────────────────────────────── */

  /** Activa el modo edición del JSON. */
  startEditing(): void {
    this.editableJson.set(this.json());
    this.editingJson.set(true);
  }

  /** Descarta los cambios y vuelve a la vista de solo lectura. */
  cancelEditing(): void {
    this.editingJson.set(false);
    this.editableJson.set('');
  }

  /** Valida y aplica el JSON editado al store, actualizando el CV y el diseño. */
  applyEditing(): void {
    const raw = this.editableJson().trim();
    if (!raw) {
      this.toast.err('El JSON no puede estar vacío.');
      return;
    }
    try {
      this.store.importJson(raw);
      this.editingJson.set(false);
      this.editableJson.set('');
      this.toast.ok('JSON aplicado al currículum.');
    } catch (err) {
      this.toast.err(
        err instanceof Error ? err.message : 'El JSON no es válido.',
      );
    }
  }
}
