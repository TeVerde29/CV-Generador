# Funcionalidades del Sistema — CV Generador

Documento de referencia del estado actual de todas las funcionalidades
implementadas. Se usa como base de verificación tras cada cambio de código.

---

## 1. Visión general

**CV Generador** es una aplicación de página única (SPA) en Angular 19.2 que
permite crear currículums vitae enteramente en el navegador, sin backend, sin
registro y sin que los datos salgan del equipo del usuario. No usa IA de ningún
tipo.

El usuario escribe su CV una vez, elige perfil, plantilla, estructura y paleta,
ve el resultado en un A4 en vivo y lo descarga en Word, PDF, Markdown o JSON.

**Estadísticas declaradas en la portada:** 16 plantillas, 7 perfiles de
currículum, 24 paletas de color, 4 formatos de salida.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Función |
|------|-----------|---------|---------|
| Framework | Angular | ^19.2.0 | SPA, componentes, signals, routing implícito |
| Lenguaje | TypeScript | ~5.7.2 | Tipado estático |
| Reactividad | RxJS | ~7.8.0 | Observables internos de Angular |
| Polyfill | zone.js | ~0.15.0 | Detección de cambios |
| Word (.docx) | docx | ^9.12.0 | Generación de documentos Word |
| Rasterizado | html2canvas | ^1.4.1 | Captura del lienzo A4 para el PDF |
| PDF | jspdf | ^4.2.1 | Generación de archivos PDF |
| Pruebas | Jasmine / Karma | 5.6.0 / 6.4.0 | Tests unitarios (36 pruebas) |
| Compresión | jszip | ^3.10.2 | Lectura de paquetes .docx en pruebas |
| Build | Angular CLI | ^19.2.0 | Compilación y servidor de desarrollo |

Tamaño del build de producción: ~830 kB bruto, ~207 kB transferido.

---

## 3. Modelo de datos (`CVData`)

Fuente única de verdad para editor, preview y todos los exportadores.

### 3.1 Datos personales (`PersonalInfo`)
- `name` — Nombre completo (obligatorio)
- `title` — Titular profesional (opcional)
- `photo` — Foto opcional como data URL (recortada a 512×512 px, JPEG)
- `email` — Correo electrónico (texto plano)
- `phone` — Teléfono (texto plano)
- `location` — Ubicación (texto plano)
- `website` — Web personal (enlace con nombre mostrado)
- `linkedin` — LinkedIn (enlace con nombre mostrado)
- `github` — GitHub (enlace con nombre mostrado)
- `portfolio` — Portafolio (enlace con nombre mostrado)

### 3.2 Secciones del CV (13 claves de sección)
| Clave | Título por defecto | Contenido |
|-------|-------------------|-----------|
| `summary` | Perfil profesional | Texto libre, máximo 1000 caracteres |
| `experience` | Experiencia profesional | Puesto, empresa, fechas, descripción, logros (lista) |
| `education` | Formación Académica | Título, institución, área, fechas |
| `skills` | Habilidades y Competencias | Grupos con categoría y lista de ítems |
| `languages` | Idiomas | Idioma y nivel (nativo/fluido/avanzado/intermedio/básico) |
| `projects` | Proyectos | Nombre, descripción, tecnologías, enlace Demo, enlace GitHub |
| `certifications` | Certificaciones, cursos y eventos | Nombre, emisor, fecha, enlace opcional |
| `publications` | Publicaciones | Título, medio, fecha, enlace opcional, descripción |
| `volunteerWork` | Voluntariado | Rol, organización, fechas, descripción |
| `awards` | Reconocimientos | Título, emisor, fecha, descripción |
| `interests` | Intereses | Lista libre de textos |
| `references` | Referencias personales | Nombre, título, email, teléfono |
| `customSection` | Sección Personalizada | Título, fechas, enlace, descripción, entradas (lista) |

### 3.3 Diseño (`JsonDesign`)
- `templateId` — Identificador de plantilla (16 disponibles)
- `layoutId` — Estructura de página (4 disponibles)
- `paletteId` — Identificador de paleta (24 disponibles)
- `customColors` — Colores personalizados (opcional)
- `sectionOrder` — Orden de secciones en el documento
- `hiddenSections` — Secciones ocultas (conservan datos, no se imprimen)
- `photoShape` — `square` o `circle`
- `showWatermark` — Línea al pie activada/desactivada
- `watermarkText` — Texto de la marca de agua

---

## 4. Funcionalidades por módulo

### 4.1 Portada (`landing.component`)
- **Texto de presentación:** Explica qué hace la herramienta y por qué no hay servidor ni IA.
- **Estadísticas:** 16 plantillas, 7 perfiles, 24 paletas, 4 formatos de salida.
- **Tres pasos:** Escribe, Elige, Descarga.
- **Lista de características:** perfiles, plantillas y estructuras, analizador de oferta, foto opcional, deshacer/rehacer, reordenar arrastrando, autoguardado, secciones que se apagan, JSON de ida y vuelta.
- **Acciones:**
  - `Generar mi CV` — Abre el editor en blanco.
  - `Ver un CV de ejemplo` — Carga `SAMPLE_CV_DATA` y abre el editor.
  - `Continuar donde lo dejaste` — Restaura el último CV guardado en localStorage (solo si hay contenido previo).
  - Cambiar tema claro/oscuro.
- **Persistencia:** Detecta si hay un CV guardado en el navegador (`canContinueSaved()`).

### 4.2 Editor de datos (`editor.component`)
Cabecera del editor:
- **Barra de progreso:** Muestra `X / 17` bloques completados y porcentaje.
- `Expandir todo` / `Contraer` — Expande o colapsa todos los bloques de sección.
- `Ejemplo` — Carga los datos de ejemplo (`SAMPLE_CV_DATA`).
- `Vaciar` — Limpia todo el contenido (confirma con `confirm()`).

Bloque 1 — **Datos personales:**
- Nombre completo, titular profesional.
- Foto (opcional): subir imagen, recorte centrado a cuadrado de 512×512 px en el navegador, vista previa, forma cuadrada o circular, cambiar/quitar.
- Email, teléfono, ubicación (texto plano).
- Sitio web, LinkedIn, GitHub, Portafolio (enlaces con nombre mostrado).

Bloque 2 — **Perfil profesional:**
- Textarea con contador de caracteres (`/ 1000`).
- Máximo 1000 caracteres aplicado al teclear y al pegar.

Bloques 3–14 — **Colecciones repetibles** (una por sección de datos):
Cada colección tiene:
- Lista de ítems con `@for` y `track by id`.
- Ítem con índice, nombre, acciones (desplegar/contraer, arrastrar, eliminar).
- Campos de entrada específicos por colección (puesto/empresa/fechas/descripción/logros, etc.).
- `appSortable` para reordenar por arrastrar y soltar.
- Atajos de teclado: flecha arriba/abajo en el tirador de arrastre.
- Botón `+ Añadir <singular>` para crear un ítem vacío.
- Badge con cantidad de ítems.

Colecciones implementadas:
1. Experiencia profesional (puesto, empresa, fechas, descripción, logros)
2. Formación (titulación, área, institución, fechas)
3. Competencias (categoría, lista de ítems)
4. Idiomas (idioma, nivel con selector nativo/fluido/avanzado/intermedio/básico)
5. Proyectos (nombre, descripción, tecnologías, enlace Demo, enlace GitHub)
6. Certificaciones (nombre, emisor, fecha, enlace)
7. Publicaciones (título, medio, fecha, enlace, resumen)
8. Voluntariado (rol, organización, fechas, descripción)
9. Reconocimientos (título, emisor, fecha, descripción)
10. Referencias (nombre, título, correo, teléfono)
11. Sección Personalizada (título, fechas, enlace, descripción, entradas)

Bloque 15 — **Orden de las secciones:**
- Lista ordenable (`appSortable="order"`) con las 13 claves de sección.
- Cada fila muestra número, etiqueta, botón mostrar/ocultar (punto), tirador de arrastre.
- `Restablecer orden` — Vuelve al orden por defecto.
- `Mostrar todas (N apagadas)` — Vuelve a mostrar las secciones ocultas.
- Hint: explica que las secciones apagadas conservan datos pero no se imprimen; en barra lateral van a la columna lateral.

### 4.3 Diseño (`design.component`)
Pestaña de diseño con cuatro grupos:

**Perfil del currículum** (combo):
- 7 perfiles: Predeterminado, Clásico, Ejecutivo, Técnico, Estudiante, Sin experiencia, Una página, MBA y Posgrado, Para Becas, Investigación.
- Cada perfil define: orden de secciones, qué secciones oculta, títulos personalizados.
- Opción `Personalizado (orden propio)` cuando el orden no coincide con ningún perfil.

**Plantillas** (16, agrupadas por 4 familias):
- Esencial: Folha, Linha, Manuscrito, Carta
- Corporativo: Corporativo, Executivo, Consultoría, Institucional
- Creativo: Técnico, Revista, Compacto, Cartel
- Académico: Académico, Universidad, Tesis, Congreso
- Cada tarjeta muestra nombre, descripción y voz tipográfica (sans/serif/mixed/mono).

**Estructura del documento** (4 layouts):
- Una columna, Barra izquierda, Barra derecha, Dos columnas.

**Paleta de color** (24 paletas en 6 familias):
- Verdes: Bosque, Oliva, Salvia, Té verde, Matcha, Eucalipto, Menta, Pistacho
- Azules y teal: Océano, Turquesa, Cielo
- Azul oscuro: Noche
- Morados: Índigo, Orquídea, Ciruela, Vino
- Tierra y rojos: Terracota, Cobre, Mostaza, Oro
- Gris y neutros: Tinta, Pizarra, Grafito, Monocromo
- Cada tarjeta muestra 3 muestrarios (primario, secundario, acento).
- **Color personalizado:** inputs tipo `color` para primario, secundario y acento.

**Botón:** `Restablecer diseño original` — Vuelve a plantilla `folha`, layout `single`, paleta `te-verde`, orden por defecto.

### 4.4 Vista previa (`preview.component` + `cv-document.component`)
- **Vista en vivo del A4:** Ancho 210 mm, mínimo 297 mm de alto, fondo blanco.
- **Zoom:** 30% a 150%, valor por defecto 80%. Botones alejar/restablecer/acercar y `Ajustar ancho`.
- **Contador de páginas:** Calcula cuántas páginas A4 ocuparía el CV al alto natural.
- **Modo JSON:** Muestra el JSON completo en un `<pre>` con botones Copiar y Descargar .json.
- **Toolbar:** Muestra plantilla activa, layout activo y número de páginas.
- **Sincronización:** El preview recibe `data`, `templateId`, `layoutId`, `colors`, `order`, `titles`, `photoShape`, `showWatermark`, `watermarkLabel` y `hiddenSections`.
- **Ocultado de secciones:** Las secciones en `hiddenSections` no se renderizan (corrección aplicada).
- **Registro del lienzo:** `PreviewRegistryService` guarda la referencia al elemento `.cv-sheet` para la exportación de PDF.

### 4.5 Exportación (`export.component` + `exporter.service`)
Panel de exportación con selección múltiple de formatos:

**Formatos disponibles:**
1. **Word (.docx):** Documento editable con plantilla, paleta y colores. Formato recomendado para filtros de texto (ATS).
2. **PDF (.pdf):** Descarga al instante con el diseño exacto del preview. Enlaces como anotaciones clicables. (Es imagen rasterizada; texto no seleccionable.)
3. **Markdown (.md):** Texto estructurado, ideal para portales de empleo y perfiles técnicos.
4. **JSON (.json):** Todos los datos y el diseño en texto plano. Se puede volver a importar.

**Opciones de exportación:**
- Casillas para seleccionar qué formatos descargar (por defecto: Word y PDF activos).
- Botón `Solo este` por formato.
- `Añadir una línea al pie` (marca de agua) con campo de texto.
- Botón principal `Exportar N formato(s)` — Descarga los seleccionados en secuencia con 320 ms de pausa entre descargas.
- Validación: no exporta si no hay contenido.

**Comportamiento por formato:**
- **JSON:** Descarga el payload completo (`version`, `data`, `design`) con `safeFileName` del nombre.
- **Markdown:** Encabezado con nombre, título, contactos (email/teléfono/ubicación como texto plano; enlaces con nombre). Secciones con títulos en español. Proyectos con `[Demo](url) · [GitHub](url)`. Certificaciones y publicaciones con `[Enlace](url)`. Email nunca como hipervínculo.
- **Word:** Encabezado con nombre, título, contactos (hipervínculos reales para perfil; texto plano para email/teléfono/ubicación). Foto flotante a la derecha. Secciones conHeadingLevel.HEADING_2, bordes personalizados, regla inferior. Títulos pueden ir centrados o alineados a izquierda según plantilla. Números de sección solo en plantilla Tesis. Barra lateral primero en layouts de sidebar.
- **PDF:** Rasterizado con html2canvas (scale 2), cortado en páginas A4 con jspdf, JPEG al 92%. Enlaces como anotaciones PDF. Propiedades de título y creador.

---

## 5. Analizador ATS de palabras clave (`ats.component` + `ats.ts`)

- **Entrada:** Textarea para pegar la oferta de empleo.
- **Procesamiento offline:** Todo ocurre en el navegador; no se envía nada a servidor; no hay IA.
- **Umbral:** Mínimo 40 caracteres en la oferta para generar reporte.
- **Extracción de palabras clave:**
  - Tokeniza términos con símbolos (`Node.js`, `C++`, `C#`, `CI/CD`, `node.js`).
  - Expresiones compuestas curadas (machine learning, deep learning, data science, big data, CI/CD, unit testing, clean code, scrum master, product owner, power bi, computer vision, natural language processing, business intelligence, data engineering, data quality).
  - Descarta stopwords (español e inglés) y ruido de anuncio (`experiencia`, `salario`, `equipo`, `empresa`, etc.).
  - Pondera por frecuencia y longitud; las frases pesan 1.4×.
- **Reporte:**
  - Nota global 0–100 (vocabulario 60 %, estructura 40 %).
  - Veredicto: Muy encajado (≥80), Buen encaje (≥65), Mejorable (≥45), Poco encajado (<45).
  - Barra de vocabulario de la oferta (% cubierto).
  - Barra de estructura del documento (% de comprobaciones superadas).
  - Términos que faltan (con contador de repeticiones) — botón `Copiar` para portapapeles.
  - Términos ya cubiertos.
  - 9 comprobaciones estructurales: contacto completo, ubicación, enlace profesional, perfil con sustancia (≥200 car.), experiencia con fechas, logros con cifras (≥3), competencias declaradas (≥5), formación indicada, idiomas indicados.
- **Botón:** `Borrar` oferta.

---

## 6. Foto opcional (`editor.component.ts`, `cropToSquare`)
- Subida de archivo con validación `image/*`.
- Recorte centrado a cuadrado de 512×512 px mediante `<canvas>`.
- Re-encodificado a JPEG con calidad 0.86 (~60 kB).
- Vista previa en editor y documento.
- Forma cuadrada o circular.
- Aviso en portada: "suma en Latinoamérica y penaliza en Estados Unidos".

---

## 7. Persistencia y autoguardado (`cv-store.service`)
- **localStorage:** 6 claves (`cvgen.data`, `cvgen.design`, `cvgen.presets`, `cvgen.palettes`, `cvgen.offer`, `cvgen.theme`).
- **Autoguardado debounced:** 600 ms tras cualquier cambio persistente.
- **Restauración al iniciar:** `normalizeCVData` limpia y valida datos importados de localStorage o JSON viejo (migra clave `url` suelta en proyectos a `demoUrl`).
- **`documentData` computed:** Devuelve el CV con las secciones ocultas vaciadas, para que preview, PDF, Word y Markdown estén de acuerdo sin que cada renderizador conozca los perfiles.

---

## 8. Historial: deshacer y rehacer (`cv-store.service`)
- `Ctrl+Z` deshacer, `Ctrl+Shift+Z` o `Ctrl+Y` rehacer.
- Historial acotado a 60 pasos.
- Coalescencia de ráfagas: cambios rápidos (menos de 700 ms) se agrupan en un solo paso.
- Botones de deshacer/rehacer en la barra superior, deshabilitados cuando no hay historial.
- El historial incluye orden de secciones y visibilidad, no solo datos del CV.

---

## 9. Reordenar con arrastrar y soltar (`sortable.directive`)
- Directiva `appSortable` en listas de ítems y en el orden de secciones.
- Tirador (`data-drag-handle`) para iniciar el arrastre.
- Retroalimentación visual (`is-dragging`, cursor `grabbing`).
- Slack de 4 px para que un clic simple no reordene.
- Reordenamiento en vivo emitiendo `moveTo`; el modelo (store) es la fuente de verdad.
- Atajos de teclado: flecha arriba/abajo en el tirador enfocado.
- `@for` con `track by id` permite que Angular mueva nodos existentes sin destruirlos.

---

## 10. Tema claro/oscuro (`app.component`)
- Detección de preferencia del sistema (`prefers-color-scheme`).
- Guardado en localStorage (`cvgen.theme`).
- Alternancia manual con botón en la barra superior.
- Variable CSS `data-theme` en `<html>`.

---

## 11. Atajos de teclado (`app.component`)
| Atajo | Acción |
|-------|--------|
| `Ctrl+Z` | Deshacer |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Rehacer |
| `Ctrl+E` | Abrir/cerrar panel de exportación |
| `Ctrl+P` | (Reservado para impresión; sin acción específica) |

---

## 12. Notificaciones (`toast.service`)
- Toasts tipo `ok`, `err`, `info` con auto-despedida a los 4500 ms.
- ID único por toast (`Date.now()` + random).
- Clic para descartar.

---

## 13. Archivos del proyecto relevantes

```
src/
  app/
    app.component.ts / .html / .scss          — Shell, tabs, tema, atajos, exportar/importar
    core/
      models/
        cv-data.ts                            — Modelo CVData, tipos de plantilla/layout/paleta
        catalog.ts                            — 16 plantillas, 4 layouts, 24 paletas, datos de ejemplo
        profiles.ts                           — 7 perfiles de currículum
        sections.ts                           — 13 claves de sección, orden por defecto, orden para sidebar
        labels.ts                             — Etiquetas en español, toHref, safeFileName
        template-look.ts                      — Tipografía y reglas por plantilla (fuente de Word)
        json-payload.ts                       — Estructura JSON de entrada/salida
        ats.ts                                — Analizador de palabras clave offline
      services/
        cv-store.service.ts                   — Estado, signals, autoguardado, historial, localStorage
        exporter.service.ts                   — Exportación Word, PDF, Markdown, JSON
        docx-look.ts                          — Conversión CSS → unidades de Word
        preview-registry.service.ts           — Referencia al lienzo A4 para PDF
        toast.service.ts                      — Notificaciones
    features/
      editor/                                 — Editor de datos (17 bloques)
      design/                                 — Perfil, plantillas, layouts, paletas
      preview/                                — Vista previa A4, contador de páginas, modo JSON
      cv-document/                            — Renderizado del CV en pantalla y para PDF
      export/                                 — Panel de exportación (4 formatos)
      import/                                 — Importación JSON (pegar o archivo)
      ats/                                    — Analizador de oferta de empleo
      landing/                                — Portada
    shared/
      sortable/                               — Directiva de arrastrar y soltar
      tag-input/                              — Editor de chips para listas
  public/
    logo-cv-generador.png                     — Logo 512×512 transparente, también favicon
```

---

Fin del documento de funcionalidades.