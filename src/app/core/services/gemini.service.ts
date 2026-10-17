import { Injectable, signal } from '@angular/core';
import { normalizeCVData, stripInlineMarkdown } from './cv-store.service';
import type { CVData } from '../models/cv-data';

const OPENAI_COMPAT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

export interface GeminiModel {
  id: string;
  displayName?: string;
}

export type OptimizePhase = 'idle' | 'connecting' | 'generating' | 'parsing' | 'done' | 'error';

/**
 * Talks to Google Gemini through its OpenAI-compatible endpoint.
 *
 * The API key lives ONLY in this service's in-memory signal: it is never
 * written to localStorage/sessionStorage/cookies and disappears on reload.
 * Requests go straight from the browser to Google (the endpoint sends the
 * CORS headers this app needs), so no backend is involved.
 */
@Injectable({ providedIn: 'root' })
export class GeminiService {
  /** Memory-only. Never persisted. */
  readonly apiKey = signal('');
  readonly model = signal('gemini-2.5-flash');
  readonly connected = signal(false);
  readonly models = signal<GeminiModel[]>([]);
  readonly busy = signal(false);
  readonly phase = signal<OptimizePhase>('idle');
  readonly status = signal('');
  readonly error = signal('');

  private controller: AbortController | null = null;

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey().trim()}`,
    };
  }

  /** GET /models — lists what this key can actually use. */
  async loadModels(): Promise<void> {
    const key = this.apiKey().trim();
    if (!key) {
      this.error.set('Introduce tu clave de API de Gemini.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${OPENAI_COMPAT_BASE}/models`, { headers: this.headers() });
      if (!res.ok) throw new Error(await this.describeError(res));
      const json = await res.json();
      const list: GeminiModel[] = (json?.data ?? json?.models ?? [])
        .map((m: any) => ({
          id: m?.id ?? m?.name ?? '',
          displayName: m?.display_name ?? m?.displayName,
        }))
        .filter((m: GeminiModel) => m.id);
      this.models.set(list);
      this.connected.set(true);
      if (list.length && !list.some((m) => m.id === this.model())) {
        // Keep the user's model if the key can still reach it.
      }
    } catch (err) {
      this.connected.set(false);
      this.error.set(err instanceof Error ? err.message : 'No se pudieron listar los modelos.');
    } finally {
      this.busy.set(false);
    }
  }

  async testConnection(): Promise<boolean> {
    const key = this.apiKey().trim();
    if (!key) {
      this.error.set('Introduce tu clave de API de Gemini.');
      this.connected.set(false);
      return false;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${OPENAI_COMPAT_BASE}/models`, { headers: this.headers() });
      if (!res.ok) throw new Error(await this.describeError(res));
      this.connected.set(true);
      await this.loadModels();
      return true;
    } catch (err) {
      this.connected.set(false);
      this.error.set(err instanceof Error ? err.message : 'Conexión fallida.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = null;
  }

  /**
   * Optimises the CV for a job context and returns structured data.
   * Never invents facts: the model may rephrase, reorder and condense only.
   */
  async optimize(cvData: CVData, jobContext: string): Promise<CVData> {
    const key = this.apiKey().trim();
    if (!key) throw new Error('Falta la clave de API de Gemini.');
    if (!this.model().trim()) throw new Error('Elige un modelo.');

    this.error.set('');
    this.status.set('Conectando con Gemini…');
    this.phase.set('connecting');
    this.busy.set(true);

    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      this.phase.set('generating');
      this.status.set('Redactando tu CV…');

      const res = await fetch(`${OPENAI_COMPAT_BASE}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model().trim(),
          temperature: 0.3,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(cvData, jobContext) },
          ],
        }),
      });

      if (!res.ok) throw new Error(await this.describeError(res));

      const json = await res.json();
      const content: string =
        json?.choices?.[0]?.message?.content ??
        json?.content?.[0]?.text ??
        '';

      if (!content.trim()) {
        throw new Error('El modelo devolvió una respuesta vacía. Prueba con otro modelo.');
      }

      this.phase.set('parsing');
      this.status.set('Revisando el resultado…');

      const parsed = parseCvJson(content);
      if (!parsed) {
        throw new Error('No se pudo interpretar la respuesta del modelo como datos de CV.');
      }

      this.phase.set('done');
      this.status.set('Optimización completada.');
      return normalizeCVData(stripInlineMarkdown(parsed));
    } catch (err) {
      this.phase.set('error');
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'La operación se canceló o superó el tiempo de espera.'
          : err instanceof Error
            ? err.message
            : 'Error inesperado al optimizar.';
      this.error.set(message);
      this.status.set(message);
      throw new Error(message);
    } finally {
      clearTimeout(timeout);
      this.busy.set(false);
      this.controller = null;
    }
  }

  /** Turns a failed response into an actionable message. */
  private async describeError(res: Response): Promise<string> {
    let detail = '';
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        detail =
          json?.error?.message ?? json?.message ?? json?.[0]?.error?.message ?? text;
      } catch {
        detail = text;
      }
    } catch {
      /* ignore */
    }
    const short = (detail || '').slice(0, 300);
    switch (res.status) {
      case 400:
        return `Solicitud rechazada por Gemini (400). Revisa la clave y el nombre del modelo. ${short}`;
      case 401:
      case 403:
        return 'Clave de API inválida o sin permisos. Verifícala en Google AI Studio.';
      case 404:
        return `El modelo no existe o ya no está disponible. Usa «Actualizar modelos» y elige otro. ${short}`;
      case 429:
        return 'Se superó la cuota de Gemini. Espera un momento o cambia de modelo.';
      case 500:
      case 503:
        return `Gemini está teniendo problemas (${res.status}). Inténtalo de nuevo en un momento.`;
      default:
        return `Error ${res.status} al contactar con Gemini. ${short}`;
    }
  }
}

/* ── Prompts ───────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Eres un estratega de CV y redactor profesional con experiencia real en selección, sistemas ATS y desarrollo de carrera.

Tu tarea: reescribir el CV que recibes para alinearlo con el puesto objetivo, sin dejar de ser cierto.

PRINCIPIOS:
1. Estructura apta para ATS — títulos de sección estándar, sin tablas ni símbolos raros.
2. Logros, no tareas — usa la fórmula "Logré [X] medido por [Y] haciendo [Z]". Usa solo las cifras que ya aparecen en los datos; NUNCA inventes una.
3. Alineación de palabras clave — refleja el lenguaje de la oferta donde la experiencia real lo permita, sin inflar ni atribuir herramientas que la persona no tiene.
4. Verbos de acción — empieza cada viñeta con un verbo fuerte y variado. No repitas el mismo verbo seguidas veces.
5. Resumen profesional — 2 o 3 frases: años de experiencia, especialidad, logro distintivo y valor para el puesto.
6. Jerarquía de relevancia — reordena y expande lo más relevante; atenúa, sin borrar, lo demás.
7. Concisión — cada viñeta de una o dos líneas. Elimina relleno y voz pasiva.
8. Habilidades — agrúpalas en categorías lógicas y pon primero las más demandadas para el puesto.

REGLAS DE INTEGRIDAD (obligatorias):
- Usa solo hechos presentes en los datos de entrada. Es la historia real de una persona.
- No inventes ni infles empresas, puestos, fechas, títulos, titulaciones, certificaciones, herramientas, proyectos, responsabilidades, tamaños de equipo ni métricas.
- Puedes reformular, reordenar, dar énfasis, condensar u omitir lo menos relevante. No puedes añadir hechos.

FORMATO DE SALIDA (obligatorio):
- Devuelve ÚNICAMENTE un objeto JSON válido. Sin markdown, sin explicaciones, sin bloques de código.
- Todos los valores de texto son texto plano: sin **negritas**, sin _cursivas_, sin backticks.
- El JSON debe conservar exactamente la misma estructura, las mismas claves de primer nivel y los mismos campos "id" que la entrada.
- Conserva todas las secciones aunque queden vacías.
- Escribe todo el contenido en el mismo idioma en que está el CV de entrada.`;

function buildUserMessage(cvData: CVData, jobContext: string): string {
  return `PUESTO OBJETIVO / CONTEXTO:
${jobContext}

DATOS ACTUALES DEL CV (conserva esta estructura, todas las claves y todos los id):
${JSON.stringify(cvData, null, 2)}

Devuelve el CV optimizado como un único objeto JSON. Sin markdown, sin envoltorios, sin explicaciones: SOLO el JSON.`;
}

/** Extracts a CV object from a model reply, tolerating fences and stray prose. */
export function parseCvJson(raw: string): unknown | null {
  const attempt = (text: string): unknown | null => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && (parsed as any).personalInfo) return parsed;
    } catch {
      /* keep trying */
    }
    return null;
  };

  const direct = attempt(raw.trim());
  if (direct) return direct;

  const withoutFences = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const fenced = attempt(withoutFences);
  if (fenced) return fenced;

  const match = raw.match(/\{[\s\S]*\}/);
  return match ? attempt(match[0]) : null;
}
