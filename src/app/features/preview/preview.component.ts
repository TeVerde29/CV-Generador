import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CvStoreService } from '../../core/services/cv-store.service';
import { PreviewRegistryService } from '../../core/services/preview-registry.service';
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

  readonly zoom = signal(80);

  private readonly holder = viewChild.required<ElementRef<HTMLElement>>('holder');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private observer?: ResizeObserver;

  ngAfterViewInit(): void {
    const el = this.viewport().nativeElement;
    this.observer = new ResizeObserver(() => {
      /* keep the current zoom, but make sure the paper stays centred */
    });
    this.observer.observe(el);
    this.fitWidth();
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

  /** A4 is 210mm ≈ 793.7 CSS px at 96 dpi. */
  fitWidth(): void {
    const available = this.viewport().nativeElement.clientWidth - 56;
    if (available <= 0) return;
    this.setZoom((available / 793.7) * 100);
  }
}
