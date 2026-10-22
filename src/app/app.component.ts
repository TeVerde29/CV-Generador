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
import { AtsComponent } from './features/ats/ats.component';
import { DesignComponent } from './features/design/design.component';
import { EditorComponent } from './features/editor/editor.component';
import { ExportComponent } from './features/export/export.component';
import { ImportComponent } from './features/import/import.component';
import { LandingComponent } from './features/landing/landing.component';
import { PreviewComponent } from './features/preview/preview.component';

type Tab = 'data' | 'design' | 'ats';
type Theme = 'light' | 'dark';
/** La portada se ve al entrar; el editor, cuando ya se está trabajando. */
type View = 'landing' | 'editor';

const THEME_KEY = 'cvgen.theme';

@Component({
  selector: 'app-root',
  imports: [
    EditorComponent,
    DesignComponent,
    AtsComponent,
    PreviewComponent,
    ExportComponent,
    ImportComponent,
    LandingComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  readonly store = inject(CvStoreService);
  readonly toasts = inject(ToastService);

  readonly view = signal<View>('landing');
  readonly tab = signal<Tab>('data');
  readonly theme = signal<Theme>('light');
  readonly exportOpen = signal(false);
  readonly importOpen = signal(false);
  readonly mobileView = signal<'panel' | 'preview'>('panel');

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'data', label: 'Datos', icon: '▤' },
    { id: 'design', label: 'Diseño', icon: '◧' },
    { id: 'ats', label: 'Análisis', icon: '◎' },
  ];

  readonly themeLabel = computed(() => (this.theme() === 'light' ? 'Tema oscuro' : 'Tema claro'));

  private readonly onKeydown = (event: KeyboardEvent): void => this.handleShortcut(event);

  ngOnInit(): void {
    this.theme.set(this.resolveTheme());
    this.applyTheme();
    // Siempre se entra por la portada: es la puerta de entrada y la que
    // explica la herramienta. Desde ahí se abre el generador.
    this.view.set('landing');
    document.addEventListener('keydown', this.onKeydown);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeydown);
  }

  /* ── Portada y editor ─────────────────────────────────────────────────── */

  /** Abre el editor, que es lo que hay detrás del botón inicial. */
  openEditor(): void {
    this.view.set('editor');
  }

  /** Vuelve a la portada. */
  goLanding(): void {
    this.view.set('landing');
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
    if (this.exportOpen()) this.importOpen.set(false);
  }

  closeExport(): void {
    this.exportOpen.set(false);
  }

  toggleImport(): void {
    this.importOpen.update((v) => !v);
    if (this.importOpen()) this.exportOpen.set(false);
  }

  closeImport(): void {
    this.importOpen.set(false);
  }
}
