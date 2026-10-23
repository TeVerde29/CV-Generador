import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

/**
 * Página de política de privacidad.
 *
 * Explica qué datos recopila el generador (ningún dato sale del navegador),
 * cómo se almacenan (localStorage) y que no se usa IA ni servidores.
 */
@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  /** Pide al shell que vuelva a la portada. */
  readonly back = output<void>();

  goBack(): void {
    this.back.emit();
  }
}
