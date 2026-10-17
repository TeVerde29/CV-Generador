# Ingeniería inversa de `cv-generator.dev-destbreso.workers.dev`

**Fecha del análisis:** 2026-10-17
**Target:** https://cv-generator.dev-destbreso.workers.dev/editor
**Versión observada en runtime:** `v1.1.0`
**Método:** análisis estático del bundle Turbopack desplegado + observación pasiva en navegador (DOM, red, `localStorage`) + lectura del código fuente.

> **Dato clave de partida:** el proyecto es **open source, licencia MIT**, publicado en
> `https://github.com/destbreso/cv-generator` (autor: David Estevez). El `homepage` del
> repo apunta a esta misma URL desplegada y el `package.json` declara `version: "1.1.0"`,
> exactamente lo que sirve el sitio en vivo (`v1.1.0` en el header).
> Es decir: **el código que estás mirando es la fuente autoritativa del sitio**, no una
> reconstrucción aproximada. Los endpoints en vivo devuelven exactamente los mismos
> mensajes de error que el código (`{"error":"LLM configuration is required"}` — 400 en
> `/api/generate-cv`, etc.), lo que confirma que el deploy corresponde a ese código.
>
> Esto es legalmente limpio: podés reutilizar, forkear y modificarlo (MIT), siempre
> conservando el aviso de copyright/licencia. Si tu objetivo es "mi propio generador con
> mi estilo y features nuevas", **el camino más corto y sólido es forkear este repo**, no
> reescribir desde cero.

---

## 1. Resumen ejecutivo

Es un **constructor de CV/résumé con IA, privacy-first, 100% en el navegador** (sin
cuentas, sin backend de datos, sin cloud sync). Su tesis de producto es:

> Tu historia profesional es **un solo dataset**. No deberías mantener 20 copias divergentes.
> Mantenés una base canónica y **generás** vistas optimizadas por IA para cada oferta.

Pilares funcionales:

1. **Editor estructurado** de todo el CV (12 secciones) con persistencia en `localStorage`.
2. **Motor de plantillas desacoplado del contenido**: 18 plantillas × 4 layouts × 14 paletas
   + paletas custom + presets favoritos.
3. **Optimización con IA** contra un "Job Context": 8 proveedores (local Ollama o cloud),
   prompt de sistema editable, selector de idioma de salida (13 idiomas), streaming de
   progreso, historial de versiones.
4. **Importación**: LinkedIn PDF o cualquier PDF (extracción con IA vía `pdf-parse`).
5. **Preview paginado real** (A4/Letter, saltos de página medidos por DOM, zoom, grid).
6. **Export**: JSON, HTML, PDF (vía diálogo de impresión), Markdown, copiar al portapapeles.
7. **Storage Manager**: dashboard completo de todo lo guardado, export/import de workspace,
   borrado selectivo.

Stack: **Next.js 16.1.6 (App Router, Turbopack) · React 19.2 · TypeScript 5 · Tailwind CSS v4 ·
Radix UI (28 primitives) · zod · sonner · react-resizable-panels · date-fns · next-themes ·
pdf-parse**. Deploy: **Cloudflare Workers vía `@opennextjs/cloudflare`** (`wrangler.jsonc`,
`nodejs_compat` para que funcione `pdf-parse`).

---

## 2. Modelo de datos (el contrato central)

`lib/types.ts` → `CVData`. Es el único esquema que atraviesa editor, IA, import, preview y export.

```
personalInfo: { name, title?, email, phone, location, website?, linkedin?, github?, portfolio? }
summary: string
experience[]:     { id, company, position, startDate, endDate, description, achievements[] }
education[]:      { id, institution, degree, field, startDate, endDate, gpa? }
skills[]:         { id, category, items[] }
languages[]:      { id, language, proficiency: native|fluent|advanced|intermediate|basic }
projects[]:       { id, name, description, technologies[], url? }
certifications[]: { id, name, issuer, date, url? }
publications[]:   { id, title, publisher, date, url?, description? }
volunteerWork[]:  { id, organization, role, startDate, endDate, description }
awards[]:         { id, title, issuer, date, description? }
interests: string[]
```

Otros tipos: `CVTemplate`, `CVIteration` (una generación guardada), `OllamaConfig`, `LLMConfig`,
`ColorPalette`, `TemplateCustomization` (fontFamily/fontSize/spacing — solo lo usa el subsistema
legacy), `CVLayout`.

**Observación de runtime:** la app hidrata en cliente (`BAILOUT_TO_CLIENT_SIDE_RENDERING`) y
guarda todo en `localStorage`; no hay IndexedDB ni base de datos.

---

## 3. Inventario completo de funcionalidades

### 3.1 Shell / layout general (`components/layout/main-layout.tsx`)

- **Splash screen** "Preparing your workspace…" (mínimo 900 ms, con animación).
- **Header**: logo → home, título, badge de versión (`v1.1.0`), badge **"Unsaved"** (punto
  amarillo cuando hay cambios sin guardar).
- **Menú Workspace** (dropdown): `Save`, `Export Workspace` (descarga
  `cv-generator-workspace-<YYYY-MM-DD>.json` con todo el localStorage), `Load Workspace`
  (importa ese JSON y recarga estado), `Privacy Policy`.
- **Píldora de estado IA**: muestra el modelo actual o "No model", punto verde si conectado,
  al hacer click abre el **AI Configuration Sheet**.
- **ThemeSwitcher**: 3 temas → `light`, `dark`, `modern` (por defecto `modern`), vía `next-themes`.
- **Toggle Preview**: oculta/muestra el panel de preview (el editor pasa a 100% de ancho).
- **Sidebar izquierdo** con 3 pasos numerados + 3 herramientas:
  1. `Your Data` → panel editor
  2. `AI Enhance` → panel de generación
  3. `Design & Export` → panel de plantillas
  - Herramientas: `History`, `Storage`, `FAQ`
  > Nota curiosa del código: el valor de estado `history` renderiza el **GeneratePanel** y
  > `export` renderiza el **HistoryPanel** (los nombres internos están cruzados).
- **Paneles redimensionables** (editor | preview) con handle arrastrable (Radix
  `react-resizable-panels`, `defaultSize 50/50`, `minSize 30`).
- **Status bar (footer)**: link GitHub, link Contribute, estado de guardado ("Saved",
  "Not saved", "Saved Xm ago" con tick cada 15 s), estado de IA ("AI: Off" / "AI: ollama"),
  "MIT License", copyright.
- **Desktop guard**: si el viewport < 1024 px, bloquea el editor con la pantalla
  **"Workbench Locked"** (`MOBILE_VIEW_DISABLED`). No hay layout móvil.

### 3.2 Editor de datos (`components/panels/cv-editor-panel.tsx`)

Secciones colapsables (`Personal Information` y `Professional Summary` abiertas por defecto):

| Sección | Campos | Badge |
|---|---|---|
| Personal Information | Full Name, Professional Title, Email, Phone, Location, Website, LinkedIn, GitHub, Portfolio | Complete / Incomplete |
| Professional Summary | Textarea + tip "150-300 caracteres" | `N chars` / Empty |
| Work Experience | Company, Position, Start Date, End Date, Description, Achievements (tags) | `N entries` |
| Education | Institution, Degree, Field of Study, Start Year, End Year | `N entries` |
| Skills | Category + items (tags) | `N categories` |
| Languages | Language + Proficiency (Native/Fluent/Advanced/Intermediate/Basic) | `N languages` |
| Projects | Project Name, URL, Description, Technologies (tags) | `N projects` |
| Certifications | Name, Issuer, Date | `N certs` |
| Publications | Title, Publisher, Date, URL, Description | `N publications` |
| Volunteer Work | Organization, Role, Start/End Date, Description | `N entries` |
| Awards & Honors | Title, Issuer, Date, Description | `N awards` |
| Interests | Tags | `N interests` |

Acciones transversales:
- **Añadir** (`+` en cada sección) y **borrar** (`Trash2`) por ítem; tags con Enter para añadir,
  click en la `×` para quitar.
- **Import** (dropdown): `LinkedIn PDF` ("AI extracts your profile data"), `Any Resume PDF`
  ("AI extracts from any PDF"), `JSON File` (backup de CV).
- **Menú overflow**: `Load Sample Data` (carga el CV de ejemplo del autor), `Export as JSON`
  (descarga `cv-data-<fecha>.json`), `Clear All Data`.
- ⚠️ Los **iconos de grip (drag&drop) son decorativos**: no hay reordenamiento de ítems
  implementado. Es una feature obvia para tu versión.
- ⚠️ Los campos `gpa`, `certifications.url`, `awards.url` existen en el tipo pero **no tienen
  input en la UI**.

### 3.3 Plantillas, layouts y paletas (`components/panels/template-panel.tsx` + `lib/cv-store.tsx`)

**Tabs: `Templates` / `Colors` / `Favorites`.**

**18 plantillas** (id → nombre → descripción): `minimal` (Clean and simple design),
`professional` (Classic corporate style), `modern` (Contemporary with sidebar),
`creative` (Bold and colorful), `executive` (Elegant and sophisticated), `tech`
(Developer-focused layout), `compact` (Dense, space-efficient layout), `academic`
(Research & academic style), `elegant` (Refined serif typography), `swiss` (International
typographic style), `editorial` (Magazine-inspired design), `startup` (Fresh, modern &
friendly), `harvard` (Classic Harvard OCS style), `oxford` (Traditional Oxford CV format),
`cambridge` (Clean Cambridge academic style), `princeton` (Bold Princeton career format),
`yale` (Refined Yale resume style), `mit` (Structured MIT engineering CV).

Cada plantilla define en `getTemplateStyles()`: `headerStyle` (center/left), `bodyFont` y
`headerFont` (sans/serif/mono), estilo de título de sección (mayúsculas, tracking, peso,
borde inferior de 1-4 px o dashed), `chipStyle` (radius de tags), y `accentBar`.

**4 layouts**: `Single Column (▢)`, `Sidebar Left (◧)`, `Sidebar Right (◨)`, `Two Column (▥)`.
- *sidebar*: 35% de ancho (mín. 220 px) con Contact/Skills/Languages/Interests/Certifications.
- *two-column*: header full-width + grid 2 columnas (izq: Summary/Experience/Publications/
  Volunteer; der: Education/Skills/Languages/Projects/Certifications/Awards/Interests).

**14 paletas** (id → primary/secondary/accent):
`default` #18181b/#71717a/#3b82f6 · `ocean` #0369a1/#0891b2/#06b6d4 · `forest`
#166534/#15803d/#22c55e · `sunset` #c2410c/#ea580c/#f97316 · `grape` #7c3aed/#8b5cf6/#a78bfa ·
`mono` #000000/#525252/#a3a3a3 · `slate` #334155/#64748b/#0ea5e9 · `rose` #9f1239/#e11d48/#fb7185 ·
`teal` #115e59/#0d9488/#2dd4bf · `amber` #92400e/#d97706/#fbbf24 · `navy` #1e3a5f/#2563eb/#60a5fa ·
`coral` #9a3412/#f43f5e/#fb923c · `lavender` #4c1d95/#7c3aed/#c4b5fd · `charcoal` #1c1917/#44403c/#78716c.

- **Custom Palette**: 3 color pickers (Primary/Secondary/Accent) → activa `selectedPaletteId: "custom"`.
- **"Save this palette"**: nombra y guarda la paleta custom (`sp-<timestamp>`) para reusarla.
- **Favorites**: guarda/restaura la combinación **plantilla + layout + paleta** con reordenar
  (subir/bajar = `priority`), aplicar y borrar. Nombre por defecto `"{Template} · {Layout}"`.

### 3.4 Subsystem de IA (`components/panels/generate-panel.tsx`, `sheets/ai-config-sheet.tsx`, `inline-ai-config.tsx`)

**8 proveedores** con defaults exactos:

| provider | baseUrl | modelo por defecto | nota |
|---|---|---|---|
| `ollama` | `http://localhost:11434` | `llama3` | local, gratis, sin API key |
| `openai` | `https://api.openai.com/v1` | `gpt-4o` | "GPT-4o, GPT-4" |
| `anthropic` | `https://api.anthropic.com/v1` | `claude-sonnet-4-20250514` | "Claude 3.5" |
| `groq` | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | "Fast inference" |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` | shim OpenAI |
| `mistral` | `https://api.mistral.ai/v1` | `mistral-small-latest` | |
| `deepseek` | `https://api.deepseek.com/v1` | `deepseek-chat` | |
| `custom` | `""` | `""` | cualquier API OpenAI-compatible |

- **Ollama se oculta** si `NEXT_PUBLIC_DISABLE_OLLAMA === "true"` (badge "Local only").
- **API keys solo en memoria** (`Partial<Record<AIProvider,string>>`), nunca en localStorage.
  Se sincronizan por proveedor y se borran al cerrar la pestaña. Aviso explícito en UI sobre
  riesgo XSS residual.
- **AIConfigSheet**: selector de proveedor (grid de tarjetas), Base URL, API Key enmascarada
  (`head(4) + **** + tail(4)`) con Copy/Change, picker de modelo con Refresh, botón
  `Connect & Load Models` / `Connected - Re-test`, preview de "AI Writing Instructions" +
  `SystemPromptDialog` (con `Reset to Default`), y `Save Configuration`.
- **InlineAIConfig (compact)**: píldoras de proveedor, select/input de modelo, refresh,
  Connect/Reconnect; colapsa a badge `"{Provider} — {model}"` con botón *Change*.
- **Panel de generación**:
  - **CV Data Status**: checklist (Personal Info, Summary >50 chars, Experience, Education,
    Skills, Projects opcional, Certifications opcional).
  - **Job Context**: textarea + quick prompts `+ Tech Lead`, `+ Startup`, `+ Remote`.
  - **Output Language**: 14 opciones (Auto + English, Español, Français, Deutsch, Português,
    Italiano, Nederlands, 中文, 日本語, 한국어, العربية, Русский, हिन्दी).
  - **Generar**: botón `Generate Optimized CV`, con `Stop`, barra de progreso y 3 etapas
    (Connecting → Generating → Processing). Requiere nombre + email + (experiencia o educación)
    + job context + conexión + modelo.
  - **Resultado**: `CV Generated!` / `Ready to apply` + botón **`Apply to Editor`** (copia el
    `generatedCVData` al editor y vuelve al paso 1). Es one-way: no hay undo ni diff.

**El prompt de sistema por defecto** (`lib/default-system-prompt.ts`) es de 8 principios:
ATS-Friendly Structure, Achievement-Driven Content (fórmula XYZ, "nunca inventar métricas"),
Keyword Alignment, Strong Action Verbs, Professional Summary, Relevance Hierarchy,
Concise & Impactful, Skills Optimization. Es **editable** por el usuario.

**El servidor añade reglas que no se pueden desactivar** (`app/api/generate-cv/route.ts`):
- `OUTPUT FORMAT RULES`: solo un objeto JSON, sin markdown, sin fences, sin negritas,
  preservar todos los `id`, no añadir/quitar claves de primer nivel.
- `INTEGRITY RULES`: usar solo hechos presentes en el input; **no inventar** empleadores,
  fechas, títulos, métricas ni números; se puede reescribir/reordenar/omitir, no añadir.
- `OUTPUT LANGUAGE` si el idioma ≠ auto.

### 3.5 Importación (`components/linkedin-import-dialog.tsx` + `app/api/parse-linkedin-pdf`)

- **Diálogo "Import from PDF"** con instrucciones de cómo descargar el PDF de LinkedIn,
  drop zone con drag&drop, acepta solo `application/pdf`, muestra nombre y peso (KB).
- Pipeline: `pdf-parse` extrae el texto en el servidor → prompt de extracción estructurada
  (le pide el JSON completo `CVData`, agrupar skills por categorías, mapear proficiencias,
  generar IDs `exp-1`, `edu-1`, etc.) → normalización con regex fallback `/\{[\s\S]*\}/`.
- Etapas visibles: **Extraction → Interpretation → Structuring** con barra y `Stop`.
- Errores: PDF vacío/imagen → 422 "Could not extract text from PDF…".
- Aplica `SET_CV_DATA` (reemplaza todo el CV del editor) + toast
  "LinkedIn profile imported successfully".
- También acepta **cualquier** résumé PDF, no solo LinkedIn.

### 3.6 Historial de versiones (`components/panels/history-panel.tsx`)

- Guarda cada generación como `CVIteration` (**máximo 50**, las más nuevas primero).
- Lista con versión `vN`, nombre del CV, tiempo relativo (`date-fns formatDistanceToNow`),
  preview del job context, badges `N exp`, `N skills`, `AI optimized`.
- Click en una versión → restaura `cvData`, `generatedContent`, `generatedCVData`,
  `jobContext` y salta al editor.
- ⚠️ Sin borrar/renombrar ítems. Existe `components/version-history.tsx` (con **DiffViewer**
  y "diferencias añadidas/removidas") pero **no está montado** — feature latente "Version
  History & Diff" marcada como WIP en la landing.

### 3.7 Preview (`components/panels/preview-panel.tsx`)

- **3 vistas**: `Visual`, `JSON` (dark card con JSON verde), `Raw` (texto crudo generado,
  solo si hay `generatedContent`).
- **Toolbar**: selector de formato de página (`A4` 210×297 mm / `Letter` 215.9×279.4 mm),
  toggle `Grid view`/`Scroll view`, **zoom** (30%–150%, step 10, default 80%), contador
  `N pg`, `Print / PDF`, `Export CV` (abre ExportSheet), `Save` (destacado cuando `isDirty`),
  y `Copy` (JSON o contenido generado).
- **Paginación real medida por DOM**: un contenedor oculto mide las alturas, descompone las
  secciones en entradas individuales, evita huérfanos (títulos pegados a su primer ítem),
  recalcula con `ResizeObserver` y **después de `document.fonts.ready`** (métricas de Geist).
  Constantes: `MIN_ADVANCE=60`, `FILL_FLOOR_RATIO=0.6`, márgenes 12 mm arriba / 14 mm abajo.
- **Skeleton durante generación/import**: una página con shimmer y badge
  "AI is optimizing your CV…" o "Importing from LinkedIn…".
- Fondo de tablero de ajedrez, sombras, y **footer watermark en cada página**:
  "Built with **CV Generator**" → `https://cv.destevez.dev`.
- ⚠️ **El watermark no se puede desactivar** (no existe toggle). Oportunidad clara para tu versión.

### 3.8 Export (`components/sheets/export-sheet.tsx` + preview)

Formatos: **JSON**, **HTML**, **PDF**, **Markdown** + **Copiar al portapapeles**.

- **Selector de fuente de datos** (si hay generación): "Original CV Data" vs "AI-Optimized CV Data".
- **Campo de nombre de archivo** con default `cv-<nombre-en-slug>`.
- **JSON**: `JSON.stringify(data, null, 2)` → `cv-<nombre>.json`.
- **HTML**: HTML paginado completo (mismas páginas y saltos que el preview) →
  `cv-<nombre>-<timestamp>.html`.
- **PDF**: **no hay librería de PDF** — abre una ventana nueva con el HTML paginado, clona
  todos los `<style>`/`<link>` (para las fuentes Geist/Tailwind), espera a `document.fonts.ready`
  y llama `window.print()` → "Save as PDF". Marca `cv_exported {type:"pdf"}`.
- **Markdown**: genera el `.md` con secciones Summary/Experience/Education/Skills/Projects.
- ⚠️ Sin export **.docx**, **.txt** ni **plain-text ATS** (existen nombres de `.docx` solo en
  el video promocional falso). Otra feature obvia para diferenciarte.

### 3.9 Storage Manager (`components/panels/storage-manager-panel.tsx` + `lib/storage-manager.ts`)

- **Secrets & Security**: muestra qué proveedores tienen API key ("N active (this session)"),
  aclara que viven **solo en memoria**.
- **Storage Usage**: `"{total} / ~5 MB"`, barra de progreso, `N active keys`, `% used`.
- **Desglose por categoría**: CV Data, AI Configuration, Templates & Styling, Preferences,
  Generation History, (API Keys memory-only).
- **Acciones**: `Refresh`, `Export Workspace` (`cv-generator-backup-<fecha>.json`),
  `Load Workspace`, `Delete Selected (N)`, `Clear All Data` (con "Export Workspace First"
  como red de seguridad).
- Por cada clave: checkbox de selección, badge amarillo **critical** (con tooltip), valor en
  mono, tamaño, e **Inspect value / Copy raw value / Delete this key** (con confirmación).
- **Búsqueda** de claves, **select all**, y sección **Unused Keys** (claves registradas aún
  sin usar).
- **Aviso de privacidad** + link a `/privacy`.

**Mapa de claves (autoritativo):**
```
STORAGE_KEYS (moderno, guion):  cv-data, ai-config, cv-iterations, cv-template,
                                cv-customization, cv-template-id, cv-palette-id,
                                cv-layout-id, cv-favorite-presets, cv-saved-palettes,
                                cv-custom-palette
LEGACY (guion bajo):            cv_data, cv_templates, cv_current_template, cv_iterations,
                                llm_config, cv_layouts, cv_current_layout,
                                template_customization_<id>
OTRAS:                          theme (next-themes), cv-gen-engagement, cv-gen-tips
SECRETO:                        ai-api-key → storage:"memory" (nunca persistido)
```

### 3.10 Páginas y contenido

- `/` → **Landing page** de marketing (hero, stats "18+ Templates / 8 AI Providers /
  4 Layout Modes / $0 Forever", secciones de propuesta de valor, demo animada de la UI,
  proceso en 3 pasos, features, sección de privacidad de API keys, FAQ, CTA).
- `/editor` → la app (client-rendered, con `DesktopGuard`).
- `/faq` → FAQ (6 categorías, 24 preguntas: General, Privacy & Data, AI Generation,
  Templates & Styling, Import & Export, Technical).
- `/privacy` → política de privacidad.
- `app/error.tsx`, `global-error.tsx`, `loading.tsx`, `editor/loading.tsx` (`CVLoading`).

### 3.11 Analítica y engagement (opcional, discrecional)

- **GA4 cookieless** (`G-SVRDR9NM4X`), Consent Mode v2 por defecto **todo denegado**.
- `track()` usa una **allowlist estricta de parámetros** (`type, name, provider, template,
  count`), strings truncados a 60 chars, números finitos. **Nunca envía contenido de CV,
  job context ni claves.**
- Eventos: `cv_generated {provider}`, `linkedin_imported {provider}`,
  `cv_exported {type:"pdf"|"html"}`, `page_view`.
- **Engagement toasts** (`use-github-engagement.ts`): pool de mensajes ponderados para pedir
  ★/contribuir (máx. 3 en total, 1 cada 5 min, se apaga si el usuario interactúa una vez),
  y **7 tips de editor** (workspace, backup, favoritos, paleta custom, multi-device, storage)
  mostrados como toasts informativos (máx. 5, uno cada 10 min, 40% de chance por disparo).

---

## 4. Superficie de API (contrato exacto)

Todos son `POST` bajo `app/api`. Sin CORS, sin proxy, sin validación con zod, sin retries.
Runtime Node por defecto; se despliegan en Workers con `nodejs_compat`.

| Endpoint | Body | Respuesta | Notas |
|---|---|---|---|
| `/api/generate-cv` | `{cvData, context, outputLanguage, llmConfig:{baseUrl,model,apiKey?,systemPrompt?,provider?}}` | **SSE**: `{status:"generating"}`, `{status:"progress",chunks}`, `{status:"done",content}`, `{status:"error",error}` | `maxDuration=120`; timeout proveedor 110 s; Ollama usa `/api/generate` con `stream:true, format:"json"`; resto `chat/completions` con `temperature:0.2`; Anthropic usa `/messages` con `x-api-key` + `anthropic-version` |
| `/api/list-models` | `{provider, baseUrl, apiKey}` | `{success:true, models:[{name,size,modified}]}` | timeout 5 s; **Anthropic hardcodeado** (`claude-opus-4-1`, `claude-sonnet-4-20250514`, `claude-haiku-3-5`, `claude-3-5-sonnet-20241022`); **OpenAI ignora el baseUrl** y pega a `api.openai.com` |
| `/api/test-connection` | `{provider, baseUrl, apiKey}` | `{success, message|error}` | timeout 10 s; Ollama GET `/api/tags`; resto GET `/models`; Anthropic POST `/messages` (`max_tokens:1`) y acepta todo salvo 401/403 |
| `/api/parse-linkedin-pdf` | `multipart/form-data`: `pdf, baseUrl, model, apiKey?, provider?` | **SSE**: `extracting` → `progress` → `done, cvData` \| `error, rawContent` | `maxDuration=120`; `pdf-parse/lib/pdf-parse`; 422 si el PDF es imagen; system message hardcodeado "You are a professional CV data extraction assistant. Return ONLY valid JSON." |
| `/api/test-ollama` | `{baseUrl}` | `{success, message, modelCount}` | **legacy**, lo usa `llm-config.tsx` que está muerto |
| `/api/test-llm` | `{endpoint, model, apiKey}` | `{success, message, model}` | **dead code**, sin callers |

Verificado en vivo: `/api/generate-cv` → 400 `{"error":"LLM configuration is required"}`,
`/api/list-models` → 400 `{"success":false,"error":"Base URL is required"}`, etc. **Coincide
1:1 con el código fuente.**

**Manejo de errores amistoso** (`lib/llm-errors.ts`): traduce 429/quota, 401/403, 404/modelo,
413/demasiado grande y 5xx a mensajes claros por proveedor (incluye "Try again in ~Ns" si el
proveedor lo sugiere).

---

## 5. Cosas que descubrí y que probablemente no sabías

**Hay dos subsistemas completos en el repo: uno "vivo" y uno "legacy/muerto".**

| Aspecto | Legacy (código muerto, no montado) | Vivo (lo que ves en el sitio) |
|---|---|---|
| Plantillas | `DEFAULT_TEMPLATES` (3: Modern, Minimal, Technical) | `TEMPLATES` (18) |
| Render | `renderTemplate()` con placeholders `{{...}}` y `{{#each}}` | componentes React |
| Paletas | 5 (incluye tema "Terminal Green" estilo consola) | 14 |
| Customización | `TemplateCustomizer` (fuente 12-18 px, títulos 20-36, spacing) | **no existe en el panel vivo** |
| Componentes no usados | `template-gallery.tsx`, `cv-preview.tsx`, `export-panel.tsx`, `llm-config.tsx`, `cv-generator.tsx`, `version-history.tsx`, `diff-viewer.tsx` | `panels/*`, `sheets/*` |

**Bugs / inconsistencias reales (y por tanto oportunidades de mejora en tu versión):**

1. **Sin reordenar** ítems (drag&drop) — iconos de grip decorativos.
2. **Sin undo ni diff** al aplicar la IA — `DiffViewer`/`VersionHistory` existen sin montar.
3. **Watermark obligatorio** "Built with CV Generator" en cada página.
4. **No hay `.docx` / `.txt` / ATS plain-text**.
5. Layout `split` del motor legacy corta el HTML a la mitad (`html.substring(0, len/2)`) → puede
   romper tags. (No afecta al motor vivo.)
6. `list-models` de OpenAI ignora el `baseUrl` custom (hardcodea `api.openai.com`).
7. `PRIVACY.md` contradice al código: dice que las API keys van a localStorage; el código las
   mantiene en memoria. Documentación desactualizada.
8. Nombres de estado cruzados en el shell (`history` → GeneratePanel, `export` → HistoryPanel).
9. Sin tests (no hay carpeta de tests ni config de testing).
10. Sin responsive: bloquea < 1024 px. Mobile-first es un diferencial enorme.
11. Sin login/sync cloud; un solo CV canónico (no multiusuario ni múltiples perfiles/CVs).
12. Sin cobertura ATS real (sin parser/score de ATS, sin análisis de keywords vs. oferta).

---

## 6. Recomendación para tu propio generador

**Enfoque A (rápido y sólido — recomendado):** `git clone` del repo (MIT) → renombrar,
reemplazar la capa visual (tokens de diseño, tipografía, paletas), y encima construir tus
features nuevas. Ya tenés Next.js 16 + React 19 + Tailwind v4 + Radix funcionando.

**Enfoque B (desde cero):** reusar el *concepto* (data-model canónico + plantillas desacopladas
+ IA opcional) y la forma del contrato `CVData`, pero escribir tu propia implementación.

**Features nuevas que este proyecto NO tiene y te diferenciarían:**
- Drag & drop para reordenar secciones e ítems + reordenar/ocultar secciones por plantilla.
- ATS Score / matcher: pegar la oferta y medir cobertura de keywords, con sugerencias.
- Export `.docx` real (ej. `docx`), `.txt` ATS y PDF nativo (React-PDF / `@react-pdf/renderer`)
  sin depender del diálogo de impresión.
- Watermark opcional / export sin marca.
- Undo/redo real + diff visual de cambios de IA con aplicar/revertir por campo.
- Múltiples CVs/perfiles y versiones con nombre.
- Sync opcional (Supabase/IndexedDB) manteniendo modo 100% local.
- Mobile/PWA responsive (hoy bloquea móvil).
- Cover letter generator a partir del mismo dataset canónico.
- i18n de la propia UI (hoy la UI está solo en inglés).
- Tests (Vitest + Playwright) y CI.

**Si querés, en una próxima iteración puedo:**
1. Clonar/limpiar el repo dentro de tu `CV-Generador` y arrancar el fork con tu design system,
   o
2. Generar el scaffold de tu versión desde cero con el `CVData` y el motor de plantillas
   ya pensados para tus features.

---

## 7. Licencia y atribución

- Licencia **MIT** © David Estevez. Podés usar, copiar, modificar, fusionar, publicar,
  distribuir y vender, **siempre incluyendo el aviso de copyright y la licencia MIT**.
- El repo incluye `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `PRIVACY.md`,
  `SECURITY.md`.
- Si reutilizás código, atribuye y conservá el texto MIT. Si sólo reutilizás ideas/conceptos,
  igualmente es buena práctica citar la inspiración.

---

### Anexo: códigos de error del servidor de generación

| Situación | Status | Mensaje |
|---|---|---|
| Falta config LLM | 400 | `LLM configuration is required` |
| Timeout proveedor (>110 s) | 504 | `The AI provider took too long to respond. Try again or pick a faster model.` |
| Proveedor inalcanzable | 502 | `Could not reach the AI provider.` |
| Respuesta vacía | 502 | `The AI provider returned an empty response. Try again or pick a different model.` |
| Error del proveedor | 502 | mensaje mapeado por `parseLLMError` |
| Proveedor no soportado | 400 | `Unsupported provider` |
| Error general | 500 | `Generation failed` |
| PDF sin texto | 422 | `Could not extract text from PDF. The file may be image-based or empty.` |
