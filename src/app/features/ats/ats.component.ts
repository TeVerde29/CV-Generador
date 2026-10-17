import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { analyzeOffer } from '../../core/models/ats';
import { CvStoreService } from '../../core/services/cv-store.service';
import { ToastService } from '../../core/services/toast.service';

/** Shortest offer worth analysing; below this the score is meaningless noise. */
const MIN_OFFER_LENGTH = 40;

@Component({
  selector: 'app-ats',
  templateUrl: './ats.component.html',
  styleUrl: './ats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsComponent {
  readonly store = inject(CvStoreService);
  private readonly toast = inject(ToastService);

  /**
   * Recomputed on every keystroke. Pure string work: no request, no tokens, so
   * you can watch the score move while you edit the CV next to the offer.
   */
  readonly report = computed(() => {
    const offer = this.store.jobOffer();
    return offer.trim().length >= MIN_OFFER_LENGTH
      ? analyzeOffer(offer, this.store.cv())
      : null;
  });

  readonly words = computed(() => {
    const text = this.store.jobOffer().trim();
    return text ? text.split(/\s+/).length : 0;
  });

  readonly hasOffer = computed(() => this.store.jobOffer().trim().length > 0);

  readonly passedCount = computed(
    () => this.report()?.checks.filter((check) => check.passed).length ?? 0,
  );

  onOfferInput(event: Event): void {
    this.store.setJobOffer((event.target as HTMLTextAreaElement).value);
  }

  clearOffer(): void {
    this.store.setJobOffer('');
  }

  /** Grabbing the missing terms is the natural next step after reading them. */
  async copyMissing(): Promise<void> {
    const missing = this.report()?.missing ?? [];
    if (missing.length === 0) return;
    try {
      await navigator.clipboard.writeText(missing.map((keyword) => keyword.label).join(', '));
      this.toast.ok(`${missing.length} palabras clave copiadas.`);
    } catch {
      this.toast.err('El navegador no permitió copiar al portapapeles.');
    }
  }
}
