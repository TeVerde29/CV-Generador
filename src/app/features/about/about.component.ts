import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

/**
 * Página "Acerca de" — explica qué es CV Generador, quién lo hizo y con qué tecnologías.
 */
@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  /** Pide al shell que vuelva a la portada. */
  readonly back = output<void>();

  goBack(): void {
    this.back.emit();
  }
}
