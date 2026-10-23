import { Injectable } from '@angular/core';
import { safeFileName } from '../models/labels';
import type { CVData, ExportFormat, PaletteColors } from '../models/cv-data';
import { JsonExporter } from './exporters/json-exporter';
import { MarkdownExporter } from './exporters/markdown-exporter';
import { DocxExporter } from './exporters/docx-exporter';
import { PdfExporter } from './exporters/pdf-exporter';

/** Qué eligió el usuario en la pestaña de diseño; las exportaciones lo respetan. */
export interface ExportDesign {
  templateId: string;
  layoutId: string;
  sectionOrder: string[];
  hiddenSections?: string[];
}

/** Opciones de exportación compartidas por todos los formatos. */
export interface ExportOptions {
  data: CVData;
  colors: PaletteColors;
  /** El lienzo renderizado del CV, usado por el PDF. */
  paperEl?: HTMLElement | null;
  templateName?: string;
  /** Títulos de sección del perfil activo; por defecto los neutrales. */
  titles?: Partial<Record<string, string>>;
  /** Línea opcional al pie; desactivada salvo que el usuario la encienda. */
  watermark?: { enabled: boolean; text: string };
  /** Tipografía, paleta y orden para el .docx. */
  design?: ExportDesign;
  /** Todo el estado como JSON, listo para descargar. */
  json?: string;
}

export interface ExportResult {
  format: ExportFormat;
  ok: boolean;
  message: string;
}

/**
 * Coordinador de exportación. Recibe el formato solicitado y delega en el
 * exportador correspondiente (JSON, Markdown, Word o PDF).
 *
 * Cada exporter es un servicio inyectable independiente; este coordinator
 * sólo une la API pública y el manejo de errores.
 */
@Injectable({ providedIn: 'root' })
export class ExporterService {
  constructor(
    private readonly json: JsonExporter,
    private readonly markdown: MarkdownExporter,
    private readonly docx: DocxExporter,
    private readonly pdf: PdfExporter,
  ) {}

  async run(format: ExportFormat, opts: ExportOptions): Promise<ExportResult> {
    const name = safeFileName(opts.data.personalInfo.name, 'cv');
    try {
      switch (format) {
        case 'markdown':
          this.markdown.exportMarkdown(opts.data, name, opts.watermark, opts.titles);
          return { format, ok: true, message: `Markdown descargado (${name}.md).` };
        case 'docx':
          await this.docx.exportDocx(
            opts.data,
            opts.colors,
            name,
            opts.watermark,
            opts.titles,
            opts.design,
          );
          return { format, ok: true, message: `Word descargado (${name}.docx).` };
        case 'pdf':
          await this.pdf.exportPdf(opts.paperEl ?? null, name, opts.design, opts.colors);
          return { format, ok: true, message: `PDF descargado (${name}.pdf).` };
        case 'json':
          this.json.exportJson(opts.json ?? this.json.buildJson(opts.data), name);
          return { format, ok: true, message: `JSON descargado (${name}.json).` };
        default:
          return { format, ok: false, message: 'Formato no soportado.' };
      }
    } catch (err) {
      return {
        format,
        ok: false,
        message: err instanceof Error ? err.message : 'No se pudo exportar el documento.',
      };
    }
  }
}
