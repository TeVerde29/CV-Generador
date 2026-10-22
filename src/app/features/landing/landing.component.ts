import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CvStoreService } from '../../core/services/cv-store.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * La portada: lo que se ve al abrir la aplicación por primera vez.
 *
 * Explica qué hace la herramienta, en qué orden se usa y por qué el
 * currículum no sale del navegador. El botón inicial pasa al editor.
 */
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly store = inject(CvStoreService);
  private readonly toast = inject(ToastService);

  /** Pide al shell que abra el editor. */
  readonly start = output<void>();

  /** Pide al shell que cambie el tema: el estado vive en la barra superior. */
  readonly toggleTheme = output<void>();

  /** Lo que pone en el botón del tema, para no repetir el texto aquí. */
  readonly themeLabel = input('');

  /** ¿Había un currículum guardado en este navegador? */
  readonly hasSavedCv = computed(() => this.store.canContinueSaved());

  readonly stats = [
    { value: '16', label: 'plantillas' },
    { value: '7', label: 'perfiles de currículum' },
    { value: '24', label: 'paletas de color' },
    { value: '4', label: 'formatos de salida' },
  ];

  readonly problems = [
    {
      title: 'Se escribe una vez',
      text: 'Tu experiencia, tus estudios y tus competencias no cambian según el puesto. Lo que cambia es qué partes quieres destacar cada vez.',
    },
    {
      title: 'Se ve como tú',
      text: 'Perfil, plantilla, estructura de página y paleta son ejes independientes: cambiar el diseño no toca ni un dato de tu currículum.',
    },
    {
      title: 'Sale donde toca',
      text: 'Word para los filtros que leen texto, PDF con el diseño exacto que ves, Markdown para portales de empleo y JSON para tus propias herramientas.',
    },
  ];

  /** Qué permite el JSON, que es lo que se descarga y se vuelve a abrir. */
  readonly jsonUses = [
    {
      title: 'Copia de seguridad',
      text: 'Descargas el .json y lo guardas donde quieras. Si borras los datos del navegador, el currículum sigue ahí, con el mismo diseño.',
    },
    {
      title: 'De un equipo a otro',
      text: 'El archivo lleva los datos y el diseño: plantilla, estructura, paleta, orden de secciones y secciones apagadas. Se abre igual en cualquier navegador.',
    },
    {
      title: 'Para tus propias herramientas',
      text: 'El formato es texto plano y con una estructura estable, así que un script, una web o una hoja de cálculo puede leer tus datos sin interpretarlos a mano.',
    },
  ];

  readonly steps = [
    {
      title: 'Escribe',
      text: 'Rellena los bloques: datos personales, perfil, experiencia, formación, competencias, idiomas, proyectos y el resto. Cada sección se puede apagar sin perder lo escrito.',
    },
    {
      title: 'Elige',
      text: 'Perfil, plantilla, estructura y paleta. La vista previa es el A4 real, con el mismo ancho de página que se imprime.',
    },
    {
      title: 'Descarga',
      text: 'Word, PDF y Markdown en un clic, con el mismo orden de secciones que ves en pantalla.',
    },
  ];

  readonly features = [
    {
      title: 'Perfiles de currículum',
      text: 'Clásico, ejecutivo, técnico, estudiante, sin experiencia o una página. Cada uno decide qué secciones salen, en qué orden y con qué títulos.',
    },
    {
      title: 'Plantillas y estructuras',
      text: 'Dieciséis plantillas en cuatro familias y cuatro estructuras: una columna, barra a la izquierda, barra a la derecha o dos columnas.',
    },
    {
      title: 'Analizador de la oferta',
      text: 'Pega la oferta y mira la nota, los términos que faltan y nueve comprobaciones estructurales. Es aritmética sobre el texto, no IA.',
    },
    {
      title: 'Foto opcional',
      text: 'Se recorta a cuadrado y se reencoda en el navegador. Avisamos de que suma en Latinoamérica y penaliza en Estados Unidos.',
    },
    {
      title: 'Deshacer y rehacer',
      text: 'Ctrl+Z y Ctrl+Shift+Z, con las pulsaciones agrupadas para que un deshacer no borre carácter a carácter.',
    },
    {
      title: 'Reordenar arrastrando',
      text: 'Cada puesto, proyecto y sección tiene su tirador. Con el tirador enfocado, las flechas también mueven.',
    },
    {
      title: 'Se guarda solo',
      text: 'Cada cambio se guarda en tu navegador. Puedes cerrar la pestaña y volver cuando quieras.',
    },
    {
      title: 'Secciones que se apagan',
      text: 'Apagar una sección la saca del documento, del Word, del PDF y del Markdown, pero conserva sus datos.',
    },
    {
      title: 'JSON de ida y vuelta',
      text: 'Descarga los datos y el diseño en un .json, vuélvelos a importar cuando quieras y úsalo desde otro programa.',
    },
  ];

  /** Carga el currículum de ejemplo y abre el editor. */
  loadSample(): void {
    this.store.loadSample();
    this.toast.ok('Datos de ejemplo cargados.');
    this.start.emit();
  }

  /**
   * El generador se abre en blanco: se empieza de cero, como la primera vez.
   * Lo que había se aparta, y la portada lo ofrece para continuar.
   */
  startFresh(): void {
    this.store.startFresh();
    this.start.emit();
  }

  /** Vuelve al currículum que había guardado en este navegador. */
  continueSaved(): void {
    this.store.restoreLastSaved();
    this.start.emit();
  }
}
