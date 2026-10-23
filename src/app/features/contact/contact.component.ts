import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

/**
 * Página de contacto — datos para escribir al creador del generador.
 */
@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  /** Pide al shell que vuelva a la portada. */
  readonly back = output<void>();

  goBack(): void {
    this.back.emit();
  }
}
