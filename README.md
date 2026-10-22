<img src="public/logo-cv-generador.png" alt="Logotipo de CV Generador" width="96">

# CV Generador — editor de currículums que corre entero en tu navegador

> Escribes el CV una vez, eliges perfil y plantilla, lo ves en A4 en vivo y lo descargas en Word,
> PDF, Markdown o JSON. Sin backend, sin registro y sin que los datos salgan del navegador.

![Estado](https://img.shields.io/badge/estado-activo-296cd8)
![Angular](https://img.shields.io/badge/Angular-19.2-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-20%2B-5FA04E?logo=nodedotjs&logoColor=white)
![Backend](https://img.shields.io/badge/backend-ninguno-1f2937)
![Licencia](https://img.shields.io/badge/licencia-MIT-16a34a)

## Capturas

| Portada | Editor de datos con el CV de ejemplo |
|---|---|
| ![Portada de CV Generador: el titular, las cifras y el botón para generar el CV](img/00-portada.png) | ![Panel de datos con el perfil, la experiencia y el A4 en vivo](img/01-editor.png) |

| Panel de diseño | Análisis frente a una oferta |
|---|---|
| ![Panel de diseño con las dieciséis plantillas agrupadas por familia](img/02-diseno.png) | ![Analizador de palabras clave con la nota y los términos que faltan](img/03-analisis.png) |

| Exportación | Vista JSON |
|---|---|
| ![Popover de exportación con los cuatro formatos y la marca al pie opcional](img/04-exportar.png) | ![Los mismos datos en JSON, listos para copiar o descargar](img/05-json.png) |

Plantilla Manuscrito con barra lateral izquierda y tema oscuro. Con barra lateral, Competencias,
Idiomas, Certificaciones e Intereses se colocan solos en la columna lateral y el documento se lee
por ahí:

![El mismo CV con la plantilla Manuscrito, barra lateral izquierda y tema oscuro](img/06-oscuro-barra-lateral.png)

## Tabla de contenidos

- [Nombre y descripción del proyecto](#nombre-y-descripción-del-proyecto)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Primeros pasos](#primeros-pasos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Funciones principales](#funciones-principales)
- [Modelo de datos](#modelo-de-datos)
- [Analizador de palabras clave](#analizador-de-palabras-clave)
- [Exportadores](#exportadores)
- [Flujo de desarrollo](#flujo-de-desarrollo)
- [Estándares de código](#estándares-de-código)
- [Pruebas](#pruebas)
- [Cómo contribuir](#cómo-contribuir)
- [Licencia](#licencia)
- [Autor](#autor)
## Nombre y descripción del proyecto

**CV Generador** es un editor de currículums que funciona entero dentro del navegador. No hay
servidor, ni cuentas, ni base de datos: el currículum vive en el `localStorage` del equipo y los
archivos se generan en esa misma pestaña.

Resuelve un problema concreto. Un currículum se escribe una vez y se envía a sitios que no se
parecen en nada: un portal con un formulario que lee el texto, un correo que espera un PDF
maquetado y una web técnica que pide un perfil técnico. La mayoría de generadores obligan a
elegir: o dan un editor bonito que exporta una imagen ilegible para un filtro, o dan una
plantilla rígida que no se puede adaptar al sector. Además suelen pedir cuenta y subir los
datos a un servidor sin necesidad.

Este editor resuelve las dos cosas:

- **Perfil y plantilla son ejes independientes.** El perfil decide *qué secciones aparecen, en qué
  orden y con qué títulos*; la plantilla decide *cómo se ve*. Se combinan como quieras.
- **Cada export va al formato que le sirve a quien lo recibe.** Word para los filtros que leen
  texto, PDF con el diseño exacto que ves, Markdown para portales y perfiles técnicos, y JSON
  para tus propias herramientas o para guardar una copia.

Quien revisa el currículum no entra en la aplicación: recibe uno de esos archivos.

## Stack tecnológico

| Capa | Tecnología | Versión | Función |
|---|---|---|---|
| Framework | [Angular](https://angular.dev) | 19.2 | Standalone components y signals; sin `NgModule` |
| Lenguaje | TypeScript | 5.7 | Contratos de `CVData` y del catálogo de diseños |
| Estilos | SCSS + variables CSS | — | Tokens en `src/styles/_tokens.scss`; las plantillas son conjuntos de variables |
| Word | [docx](https://www.npmjs.com/package/docx) | 9.12 | OOXML real en el navegador, con hipervínculos, viñetas e imagen |
| PDF | [html2canvas](https://www.npmjs.com/package/html2canvas) + [jspdf](https://www.npmjs.com/package/jspdf) | 1.4 / 4.2 | Rasteriza el A4 y lo corta en páginas; se cargan solo al pulsar «PDF» |
| Pruebas | [Karma](https://karma-runner.github.io) + [Jasmine](https://jasmine.github.io) | 6.4 / 5.6 | 36 pruebas unitarias; el `.docx` se abre de verdad con `jszip` |
| Estado | `localStorage` | — | Autoguardado del CV, del diseño, de la oferta y del tema |
| Backend | **ninguno** | — | `ng build` produce un sitio estático |

Angular 19 se instaló con el CLI oficial. No hay Tailwind ni librería de componentes: el sistema
de diseño son tokens, con temas claro y oscuro. El currículum se imprime con pilas del sistema
(según la plantilla, serif, sans o monoespaciada), así que no se descarga ninguna fuente y el
`.docx` y el PDF se ven igual sin conexión.

## Arquitectura del proyecto

```
┌──────────────────────────────────────────────────────────────┐
│  Portada (features/landing)  →  «Generar mi CV»  →  Editor   │
└──────────────────────────────────────────────────────────────┘
        │                                   │
        │                          ┌────────┴────────┐
        │                          │                 │
   core/models               core/services      features/
   (datos puros)              (estado + IO)      (pantallas)
        │                          │                 │
        └──────────────┬───────────┴─────────────────┘
                       │
                  shared/  (sortable, tag-input)
```

La idea central: **un solo servicio con signals** (`cv-store.service.ts`) es el estado. El
editor, el panel de diseño, el analizador, la vista previa y los exportadores leen de ahí, así
que no hay copias que sincronizar.

- **`core/models`** — datos puros, sin Angular: el contrato `CVData`, el catálogo de diseños, los
  perfiles, las secciones, el analizador y el payload JSON.
- **`core/services`** — el estado (`cv-store.service.ts`), los exportadores y el registro del
  lienzo renderizado.
- **`features`** — las pantallas: portada, editor, diseño, análisis, importación, exportación y
  vista previa.
- **`shared`** — lo reutilizable: la reordenación con puntero y teclado, y el editor de etiquetas.

Reglas que sostienen el resto:

- **Vista previa y exports comparten funciones.** `documentOrder()` y `orderedSections()` de
  `sections.ts` las usan el documento en pantalla y el exportador, así que el Word lista las
  secciones en el mismo orden que la pantalla.
- **El diseño de una plantilla está declarado dos veces a propósito**, en el SCSS (para la
  pantalla) y en `template-look.ts` (para Word, que no entiende CSS). Sin ese espejo, el `.docx`
  salía con la tipografía y el azul por defecto de Word.
- **El perfil no se guarda, se deriva.** Comparando el orden y la visibilidad reales de las
  secciones con cada perfil del catálogo: en cuanto ajustas el orden a mano, el desplegable dice
  «Personalizado» y nunca miente sobre lo que hay en el documento.
- **El documento del CV no usa los tokens de la aplicación.** Define los suyos (`--cv-*`) y se
  imprime siempre sobre blanco, con la paleta que elija el usuario: el tema de la aplicación no
  altera el currículum.

## Primeros pasos

**Requisitos:** Node.js 20 o superior (probado con Node 22 y 24) y npm 10 o superior.

```bash
git clone https://github.com/TeVerde29/CV-Generador.git
cd CV-Generador
npm install
npm start          # servidor de desarrollo en http://localhost:4200
```

Otros comandos:

```bash
npm run build      # compila a dist/cv-generador (sitio estático)
npm run watch      # compila en modo desarrollo y vigila cambios
npm test           # 36 pruebas unitarias: Karma + Jasmine en Chrome headless
```

`npm run build` no necesita servidor de aplicaciones: `dist/cv-generador` se puede publicar en
GitHub Pages, Netlify o un bucket S3 tal cual.

> **Si `npm test` se queda esperando navegador:** Karma necesita Chrome. En un equipo donde solo
> está Edge, se le dice dónde está: `CHROME_BIN="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" npm test`.

### Flujo básico de uso

1. **Portada** → «Generar mi CV» abre el generador en blanco (o «Continuar donde lo dejaste» si
   había un currículum guardado en ese navegador).
2. **Escribe los datos** en el panel «Datos»: catorce bloques desplegables, cada uno con su
   contador. La barra superior lleva la cuenta.
3. **Elige el diseño** en «Diseño»: perfil, plantilla, estructura de página y paleta.
4. **Pega la oferta** en «Análisis» y revisa la nota: el vocabulario que falta aparece arriba del
   todo, con un botón para copiarlo.
5. **Exporta** con el botón azul: marca los formatos (Word, PDF, Markdown y JSON) y pulsa
   «Exportar N formatos».
6. Todo se guarda solo: al volver a `http://localhost:4200` está todo como lo dejaste.

Atajos: `Ctrl+Z` deshacer, `Ctrl+Shift+Z` o `Ctrl+Y` rehacer y `Ctrl+E` abre o cierra la
exportación.

## Estructura del proyecto

```
karma.conf.js                    # lanzador ChromeHeadlessCI (--headless=new)
angular.json                     # build a dist/cv-generador; jspdf, html2canvas y canvg como CommonJS
src/
├── index.html                   # tema aplicado antes del primer pintado
├── main.ts                      # bootstrapApplication(AppComponent)
├── styles.scss                  # reset + primitivas compartidas (.btn, .input, .badge, .toast…)
├── styles/_tokens.scss          # color, tipografía, radios y sombras; temas claro y oscuro
└── app/
    ├── app.component.*           # shell: barra superior, rail de pestañas, panel y lienzo
    ├── core/
    │   ├── models/
    │   │   ├── cv-data.ts             # contrato CVData + normalizeCVData() tolerante
    │   │   ├── catalog.ts             # 16 plantillas, 4 estructuras, 24 paletas y CV de ejemplo
    │   │   ├── profiles.ts            # 7 perfiles: secciones visibles, orden y títulos
    │   │   ├── sections.ts            # SectionKey, orden por defecto, lado y documentOrder()
    │   │   ├── template-look.ts       # el aspecto de cada plantilla como datos (lo que lee el .docx)
    │   │   ├── json-payload.ts        # el JSON de ida y vuelta: se arma, se lee y se normaliza
    │   │   ├── labels.ts              # etiquetas de contacto y proyecto, toHref() y safeFileName()
    │   │   └── ats.ts                 # analizador: tokenizado, extracción, 9 comprobaciones y nota
    │   └── services/
    │       ├── cv-store.service.ts       # signals, autoguardado, CRUD, historial, JSON y perfiles
    │       ├── exporter.service.ts       # Markdown, .docx, PDF, JSON y ayudantes de paginación
    │       ├── docx-look.ts              # traduce template-look a medios puntos, twips y fuentes
    │       ├── preview-registry.service.ts # expone el A4 renderizado al exportador de PDF
    │       └── toast.service.ts
    ├── features/
    │   ├── landing/              # portada: qué es, cómo funciona y el botón inicial
    │   ├── editor/               # panel de datos: catorce bloques, orden y visibilidad
    │   ├── design/               # panel de diseño: perfil, plantilla, estructura, paleta
    │   ├── ats/                  # panel de análisis frente a la oferta
    │   ├── import/               # popover para traer un currículum desde un .json
    │   ├── export/               # popover de exportación
    │   └── preview/
    │       ├── preview.component.*      # zoom, páginas, y conmutador Documento / JSON
    │       └── cv-document/             # el A4: plantillas y estructuras por variables CSS
    └── shared/
        ├── tag-input/           # editor de listas de etiquetas (Enter añade, Retroceso quita)
        └── sortable/            # reordenación con puntero y teclado
```

## Funciones principales

- **Portada de inicio.** Explica la herramienta, el problema que resuelve y la privacidad; el
  botón inicial abre el generador en blanco.
- **Catorce bloques de datos.** Datos personales, perfil profesional, experiencia, formación,
  competencias, idiomas, proyectos, certificaciones y cursos, publicaciones, voluntariado,
  reconocimientos, referencias, sección personalizada e intereses. Cada bloque se pliega y se
  despliega por separado.
- **Siete perfiles de currículum** (Predeterminado, Clásico, Ejecutivo, Técnico, Estudiante, Sin
  experiencia y Una página) que cambian secciones, orden y títulos.
- **Dieciséis plantillas** en cuatro familias (Esencial, Corporativo, Creativo y Académico), con
  cuatro estructuras de página: una columna, barra izquierda, barra derecha y dos columnas.
- **Veinticuatro paletas** más color propio (principal, secundario y acento a mano).
- **Secciones que se encienden y se apagan:** apagar una sección conserva sus datos y la saca del
  documento, del Word, del PDF y del Markdown.
- **Reordenar arrastrando:** cada elemento y cada sección tienen tirador; con el tirador enfocado,
  las flechas mueven una posición.
- **Deshacer y rehacer de verdad:** `Ctrl+Z` y `Ctrl+Shift+Z`, con las pulsaciones agrupadas en
  una ventana de 700 ms para no retroceder carácter a carácter.
- **Autoguardado:** cada cambio se guarda en `cvgen.data` y `cvgen.design` sin botones ni avisos.
- **Foto opcional, apagada por defecto:** se recorta a cuadrado y se reencoda a 512 px JPEG en el
  navegador, y viaja dentro del `.docx` y del PDF.
- **Analizador de la oferta:** nota de 0 a 100, términos que faltan ordenados por peso, botón
  para copiarlos y nueve comprobaciones estructurales.
- **Vista Documento / JSON:** el mismo currículum en el A4 real o en texto plano, con copiar,
  descargar e importar.
- **Tema claro y oscuro** con detección de la preferencia del sistema, y vista de una sola
  columna en móvil con conmutador «Editar / Vista previa».
- **Diseño Tea Green:** superficies blancas, verde bosque para lo importante y verde té como
  acento, con contrastes verificados en WCAG AA.

## Modelo de datos

`CVData` es el único contrato, definido en `core/models/cv-data.ts`:

```ts
interface CVData {
  personalInfo: {
    name: string; title: string; email: string; phone: string; location: string;
    website: string; linkedin: string; github: string; portfolio: string;
    photo?: string;            // data URL JPEG de 512 px, solo si el usuario la añade
  };
  summary: string;             // perfil profesional, hasta 1000 caracteres
  experience: ExperienceItem[];      // puesto, empresa, fechas, descripción, logros[]
  education: EducationItem[];        // titulación, área, institución, fechas
  skills: SkillGroup[];              // { categoría, items[] }
  languages: LanguageItem[];         // idioma + nivel (5 valores)
  projects: ProjectItem[];           // nombre, descripción, tecnologías[], demoUrl, repoUrl
  certifications: CertificationItem[];// nombre, emisor, fecha, url
  publications: PublicationItem[];    // título, medio, fecha, url, descripción
  volunteerWork: VolunteerItem[];    // organización, rol, fechas, descripción
  awards: AwardItem[];               // título, emisor, fecha
  references: ReferenceItem[];       // nombre, título, correo, teléfono
  customSections: CustomSectionItem[]; // título, fechas, enlace, descripción, entradas[]
  interests: string[];
}
```

Todo lo que entra por `localStorage` pasa por `normalizeCVData()`: rellena campos ausentes,
descarta tipos incorrectos y migra el `url` único de los proyectos a `demoUrl` / `repoUrl`. Una
copia antigua o manipulada no rompe la aplicación.

Claves de almacenamiento, todas con prefijo `cvgen.`:

| Clave | Contenido |
|---|---|
| `cvgen.data` | El CV completo (`CVData`), foto incluida |
| `cvgen.design` | Plantilla, estructura, paleta, colores propios, orden de secciones, secciones apagadas, forma de la foto y marca al pie |
| `cvgen.presets` | Combinaciones de diseño guardadas |
| `cvgen.palettes` | Paletas propias guardadas |
| `cvgen.offer` | La oferta pegada para el análisis |
| `cvgen.theme` | Tema claro u oscuro |

## Analizador de palabras clave

El panel «Análisis» compara la oferta con el CV en el navegador. La nota es una media ponderada:

```
nota = 60 % vocabulario de la oferta cubierto + 40 % estructura del documento
```

- **Vocabulario:** extrae hasta 40 términos (palabras y frases de dos o tres palabras), los pesa
  por apariciones y longitud, y cuenta cuántos aparecen ya en el CV. Ambas partes se normalizan
  igual (minúsculas y sin acentos), así que ni las tildes ni las mayúsculas producen un falso
  «falta».
- **Estructura:** nueve comprobaciones con peso propio.

| Comprobación | Peso |
|---|---|
| Datos de contacto completos (correo y teléfono) | 15 |
| Experiencia con fechas en todos los puestos | 15 |
| Perfil profesional de 200 caracteres o más | 12 |
| Al menos tres logros con cifras | 12 |
| Cinco competencias o más | 12 |
| Formación indicada | 10 |
| Ubicación indicada | 8 |
| Enlace profesional (LinkedIn, GitHub o portafolio) | 8 |
| Idiomas indicados | 8 |

Veredictos: `Muy encajado` desde 80, `Buen encaje` desde 65, `Mejorable` desde 45 y `Poco encajado`
por debajo. Cada comprobación explica por qué importa, y los términos que faltan se ordenan por
peso para que lo primero que leas sea lo que el filtro busca.

## Exportadores

| Formato | Cómo se genera | Qué trae y qué límite tiene |
|---|---|---|
| Word (`.docx`) | `docx` 9 en el navegador (`exporter.service.ts` + `docx-look.ts`) | Documento editable con la tipografía, los colores de la paleta, las reglas de los títulos, el orden de secciones y los hipervínculos. La maquetación es lineal de una columna aunque elijas barra lateral: ningún ATS se pierde entre cuadros de texto |
| PDF (`.pdf`) | `html2canvas` + `jspdf`, cargados solo al pulsar «PDF» | Descarga inmediata, sin diálogo de impresión. El corte busca el principio de una sección antes de partir una línea y las páginas de continuación conservan el margen superior. Al ser una imagen el texto no se puede seleccionar, así que los enlaces se añaden como anotaciones sobre el texto que los muestra |
| Markdown (`.md`) | Texto plano, sin dependencias | Estructura limpia para portales de empleo y perfiles técnicos. No lleva la foto (un `.md` no tiene imágenes) |
| JSON (`.json`) | Texto plano, con los datos y el diseño | El viaje de ida y vuelta: se descarga, se vuelve a importar y se puede leer desde otro programa. Acepta también un JSON con solo los datos |

Los cuatro formatos se pueden marcar y descargar juntos, o uno a uno con «Solo este». La **marca al
pie opcional** está desactivada por defecto y, si se activa, se aplica a todos.

## Flujo de desarrollo

- **Ramas:** `main` es la rama estable; el trabajo se hace en ramas de función
  (`feat/…`, `fix/…`) y llega a `main` con un *merge* o un *squash*.
- **Commits:** mensajes en español con el formato `<tipo>(<ámbito>): <resumen>`, en modo
  imperativo. Tipos: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`,
  `style`.
- **Antes de publicar:** `npm test` y `npm run build` tienen que pasar.
- **Sin servidor:** `npm start` levanta el de desarrollo; `npm run build` genera el sitio
  estático de `dist/cv-generador`.

## Estándares de código

- **Angular standalone y signals**, sin `NgModule` ni `rxjs` para el estado: la reactividad es
  `signal()`, `computed()` y `effect()`.
- **Comentario con explaining el porqué**, no el qué. Cada función no obvia de `core/models`
  explica por qué existe, no qué hace.
- **Tipado estricto.** Nada de `any` para callar al compilador: cuando hace falta, se usa un tipo
  explícito o un `unknown` con una comprobación.
- **SCSS con tokens.** Los componentes no ponen colores a mano: usan `var(--…)`. El documento del
  CV tiene sus propios tokens (`--cv-*`) para no depender del tema de la aplicación.
- **Nombres en inglés, textos en español.** El código, los identificadores y los comentarios
  técnicos van en inglés; lo que ve la persona, en español.
- **Formato:** dos espacios, comillas simples, punto y coma siempre, línea final y sin espacios
  finales (`.editorconfig`).

## Pruebas

```bash
npm test
```

36 pruebas unitarias repartidas por capa:

1. **Analizador** (`core/models/ats.spec.ts`, 13 pruebas): tokenizado sin acentos, extracción de
   términos y frases, pesos, y la nota final. Lógica pura, sin DOM.
2. **Modelo de datos** (`core/services/cv-store.service.spec.ts`, 4 pruebas): normalización del CV y
   migración de enlaces de proyectos.
3. **Exportadores** (`core/services/exporter.service.spec.ts`, 19 pruebas): Markdown, geometría de
   `docxLook` y el `.docx` de verdad. Las pruebas de Word descomprimen el paquete con `jszip` y
   buscan en `word/document.xml` la tipografía, los colores de la paleta, el orden de las secciones,
   el orden de lectura con barra lateral y el centrado de títulos frente al cuerpo, que es donde
   se escapó el fallo más caro de esta parte.

`karma.conf.js` define el lanzador `ChromeHeadlessCI` con `--headless=new` y
`--remote-debugging-port=0`, porque el lanzador estándar de Karma usa el flag `--headless` antiguo
que las versiones recientes de Chrome ya no aceptan, y porque evita pelearse con otra sesión de
DevTools por el puerto 9222.

## Cómo contribuir

1. Abre una incidencia describiendo el cambio o el fallo.
2. Crea una rama desde `main`: `git checkout -b feat/mi-cambio`.
3. Escribe el código siguiendo los estándares de arriba y **añade pruebas** si tocas lógica: lo
   que no se prueba acaba roto sin avisar.
4. Comprueba que `npm test` y `npm run build` pasan.
5. Haz el commit con un mensaje en español y abre un *pull request* contra `main`.

Guía de estilo con ejemplos: mira `core/services/cv-store.service.ts` (estado, historial y
persistencia) y `core/services/exporter.service.ts` (un exportador por formato, con la geometría
separada en `docx-look.ts`).

## Licencia

MIT. El diseño está pensado para que cada persona lo use, lo modifique y lo publique sin pedir
permiso a nadie.

## Autor

**Pedro Giovanni Ricra Figueroa** — Ingeniería de Sistemas

[GitHub](https://github.com/TeVerde29) · [hikih020@gmail.com](mailto:hikih020@gmail.com)

---

Si este proyecto te resultó útil, considera darle una estrella en GitHub.
