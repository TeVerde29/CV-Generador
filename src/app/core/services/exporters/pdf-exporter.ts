import { Injectable } from '@angular/core';
import type { PaletteColors } from '../../models/cv-data';
import type { ExportDesign } from '../exporter.service';

/** Exporta el CV como PDF rasterizando el lienzo del preview con html2canvas + jspdf. */
@Injectable({ providedIn: 'root' })
export class PdfExporter {
  /**
   * Construye el PDF y lo descarga. Requiere el elemento `.cv-sheet` del preview.
   *
   * El diseño (plantilla, layout, orden, secciones ocultas) y los colores se
   * aplican al clon rasterizado, así que el PDF no depende del estado del DOM
   * del preview en el instante del clic.
   */
  async exportPdf(
    paperEl: HTMLElement | null,
    name: string,
    design?: ExportDesign,
    colors?: PaletteColors,
  ): Promise<void> {
    if (!paperEl) throw new Error('El lienzo del CV todavía no está listo.');

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const raster = await this.rasterize(paperEl, html2canvas, design, colors);
    const { canvas } = raster;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pagePixels = (canvas.width * pageHeight) / pageWidth;
    const inset = raster.padTop;
    const insetMm = (inset * pageWidth) / canvas.width;
    const mm = pageWidth / canvas.width;

    let offset = 0;
    let page = 0;
    while (offset < canvas.height) {
      const limit = page === 0 ? pagePixels : pagePixels - inset;
      const end = this.endOfPage(raster, offset, offset + limit, canvas.height);
      const height = Math.max(1, Math.round(end - offset));
      const top = page > 0 ? insetMm : 0;
      if (page > 0) pdf.addPage();
      pdf.addImage(this.slice(canvas, offset, height), 'JPEG', 0, top, pageWidth, height * mm);
      for (const link of raster.links) this.addLink(pdf, link, offset, end, top, mm);
      offset += height;
      page += 1;
    }

    pdf.setProperties({ title: `CV — ${name}`, creator: 'CV-Generador' });
    pdf.save(`${name}.pdf`);
  }

  /* ── Enlaces y paginación ────────────────────────────────────────────── */

  private addLink(
    pdf: import('jspdf').jsPDF,
    link: RasterLink,
    bandTop: number,
    bandBottom: number,
    pageTop: number,
    mm: number,
  ): void {
    const top = Math.max(link.top, bandTop);
    const bottom = Math.min(link.top + link.height, bandBottom);
    if (bottom - top < link.height * 0.4) return;
    pdf.link(link.left * mm, pageTop + (top - bandTop) * mm, link.width * mm, (bottom - top) * mm, {
      url: link.url,
    });
  }

  private endOfPage(
    raster: { sections: number[]; items: number[] },
    offset: number,
    ideal: number,
    total: number,
  ): number {
    if (ideal >= total) return total;
    const floor = offset + (ideal - offset) * 0.65;
    return (
      this.lastCut(raster.sections, floor, ideal) ||
      this.lastCut(raster.items, floor, ideal) ||
      ideal
    );
  }

  private lastCut(cuts: number[], floor: number, ideal: number): number {
    let best = 0;
    for (const cut of cuts) {
      if (cut >= floor && cut <= ideal && cut > best) best = cut;
    }
    return best;
  }

  /* ── Rasterizado ─────────────────────────────────────────────────────── */

  private async rasterize(
    paperEl: HTMLElement,
    html2canvas: typeof import('html2canvas')['default'],
    design?: ExportDesign,
    colors?: PaletteColors,
  ): Promise<{
    canvas: HTMLCanvasElement;
    sections: number[];
    items: number[];
    padTop: number;
    links: RasterLink[];
  }> {
    const host = document.createElement('div');
    host.setAttribute(
      'style',
      'position:fixed;left:-10000px;top:0;background:#ffffff;width:210mm;',
    );
    const clone = paperEl.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';

    if (design?.templateId && design?.layoutId) {
      clone.className = `cv-sheet tpl-${design.templateId} layout-${design.layoutId}`;
    }

    if (colors) {
      clone.style.setProperty('--cv-primary', colors.primary);
      clone.style.setProperty('--cv-secondary', colors.secondary);
      clone.style.setProperty('--cv-accent', colors.accent);
    }

    host.appendChild(clone);
    document.body.appendChild(host);
    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const offsets = this.blockOffsets(clone, canvas);
      return { canvas, ...offsets, links: this.linkRects(clone, canvas) };
    } finally {
      host.remove();
    }
  }

  private linkRects(clone: HTMLElement, canvas: HTMLCanvasElement): RasterLink[] {
    const rect = clone.getBoundingClientRect();
    const height = clone.offsetHeight || rect.height;
    if (!height) return [];
    const factor = canvas.height / height;
    const out: RasterLink[] = [];
    clone.querySelectorAll('a[href]').forEach((node) => {
      const anchor = node as HTMLAnchorElement;
      const box = anchor.getBoundingClientRect();
      if (!box.width || !box.height || !anchor.href.startsWith('http')) return;
      out.push({
        url: anchor.href,
        left: (box.left - rect.left) * factor,
        top: (box.top - rect.top) * factor,
        width: box.width * factor,
        height: box.height * factor,
      });
    });
    return out;
  }

  private blockOffsets(
    clone: HTMLElement,
    canvas: HTMLCanvasElement,
  ): { sections: number[]; items: number[]; padTop: number } {
    const rect = clone.getBoundingClientRect();
    const height = clone.offsetHeight || rect.height;
    if (!height) return { sections: [], items: [], padTop: 0 };
    const factor = canvas.height / height;
    const offsetsIn = (selector: string): number[] =>
      Array.from(clone.querySelectorAll(selector))
        .map((node) => (node.getBoundingClientRect().top - rect.top) * factor)
        .filter((top) => top > 24)
        .sort((a, b) => a - b);
    const padTop = (Number.parseFloat(getComputedStyle(clone).paddingTop) || 0) * factor;
    return { sections: offsetsIn('.cv-section'), items: offsetsIn('.cv-item'), padTop };
  }

  private slice(canvas: HTMLCanvasElement, offset: number, height: number): string {
    const band = document.createElement('canvas');
    band.width = canvas.width;
    band.height = height;
    const ctx = band.getContext('2d');
    if (!ctx) throw new Error('El navegador no permitió preparar el PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, band.width, band.height);
    ctx.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
    return band.toDataURL('image/jpeg', 0.92);
  }
}

interface RasterLink {
  url: string;
  left: number;
  top: number;
  width: number;
  height: number;
}
