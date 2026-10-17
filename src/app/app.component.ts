import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CvStoreService } from './core/services/cv-store.service';
import { ToastService } from './core/services/toast.service';
import { AiComponent } from './features/ai/ai.component';
import { DesignComponent } from './features/design/design.component';
import { EditorComponent } from './features/editor/editor.component';
import { ExportComponent } from './features/export/export.component';
import { PreviewComponent } from './features/preview/preview.component';

type Tab = 'data' | 'design' | 'ai';
type Theme = 'light' | 'dark';

const THEME_KEY = 'cvgen.theme';

@Component({
  selector: 'app-root',
  imports: [EditorComponent, DesignComponent, AiComponent, PreviewComponent, ExportComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  readonly store = inject(CvStoreService);
  readonly toasts = inject(ToastService);

  readonly tab = signal<Tab>('data');
  readonly theme = signal<Theme>('light');
  readonly exportOpen = signal(false);
  readonly mobileView = signal<'panel' | 'preview'>('panel');

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'data', label: 'Datos', icon: '▤' },
    { id: 'design', label: 'Diseño', icon: '◧' },
    { id: 'ai', label: 'IA', icon: '✦' },
  ];

  readonly saveLabel = computed(() => (this.store.dirty() ? 'Guardando…' : 'Guardado'));
  readonly themeLabel = computed(() => (this.theme() === 'light' ? 'Tema oscuro' : 'Tema claro'));

  private readonly onKeydown = (event: KeyboardEvent): void => this.handleShortcut(event);

  ngOnInit(): void {
    this.theme.set(this.resolveTheme());
    this.applyTheme();
    document.addEventListener('keydown', this.onKeydown);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeydown);
  }

  /* ── Theme ───────────────────────────────────────────────────────────── */

  private resolveTheme(): Theme {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.theme());
    try {
      localStorage.setItem(THEME_KEY, this.theme());
    } catch {
      /* storage unavailable — keep the theme for this session only */
    }
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
    this.applyTheme();
  }

  /* ── Keyboard ────────────────────────────────────────────────────────── */

  private handleShortcut(event: KeyboardEvent): void {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    const key = event.key.toLowerCase();

    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.store.undo();
      return;
    }
    if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      this.store.redo();
      return;
    }
    if (key === 'p') {
      // Let the browser print the current view; the print styles show the sheet only.
      return;
    }
    if (key === 'e') {
      event.preventDefault();
      this.exportOpen.update((v) => !v);
    }
  }

  toggleExport(): void {
    this.exportOpen.update((v) => !v);
  }

  closeExport(): void {
    this.exportOpen.set(false);
  }
}
