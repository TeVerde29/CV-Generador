import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CvStoreService } from '../../core/services/cv-store.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Importar un currículum desde un JSON.
 *
 * Se puede pegar el texto o abrir el archivo. El JSON puede ser el que
 * descarga esta herramienta (datos y diseño) o solo la parte de datos.
 */
@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportComponent {
  private readonly store = inject(CvStoreService);
  private readonly toast = inject(ToastService);

  /** Avisa al shell para que cierre el popover. */
  readonly done = output<void>();

  /** El texto pegado, a la espera de importarlo. */
  readonly draft = signal('');

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Importa lo que hay pegado. */
  importPasted(): void {
    const raw = this.draft().trim();
    if (!raw) {
      this.toast.err('Pega primero el contenido de un JSON.');
      return;
    }
    this.apply(raw);
  }

  /** Importa el archivo elegido con el explorador. */
  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.draft.set(String(reader.result ?? ''));
      this.apply(this.draft());
    };
    reader.onerror = () => this.toast.err('No se pudo leer el archivo.');
    reader.readAsText(file);
  }

  private apply(raw: string): void {
    try {
      this.store.importJson(raw);
      this.draft.set('');
      this.toast.ok('Currículum importado.');
      this.done.emit();
    } catch (err) {
      this.toast.err(
        err instanceof Error ? err.message : 'El archivo no es un JSON válido.',
      );
    }
  }
}
