import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Chip-style editor for short string lists (achievements, skills, technologies).
 * Enter adds, Backspace on an empty field removes the last entry.
 */
@Component({
  selector: 'app-tag-input',
  templateUrl: './tag-input.component.html',
  styleUrl: './tag-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagInputComponent {
  readonly values = input<string[]>([]);
  readonly placeholder = input('Añade un elemento y pulsa Enter');
  readonly changed = output<string[]>();

  readonly draft = signal('');
  readonly canAdd = computed(() => this.draft().trim().length > 0);

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  add(): void {
    const value = this.draft().trim();
    if (!value) return;
    const exists = this.values().some((v) => v.toLowerCase() === value.toLowerCase());
    if (!exists) {
      this.changed.emit([...this.values(), value]);
    }
    this.draft.set('');
  }

  remove(index: number): void {
    this.changed.emit(this.values().filter((_, i) => i !== index));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.add();
      return;
    }
    if (event.key === 'Backspace' && !this.draft() && this.values().length) {
      this.remove(this.values().length - 1);
    }
  }
}
