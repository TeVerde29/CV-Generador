import { Injectable } from '@angular/core';
import { safeFileName } from '../../models/labels';
import { stringifyJson } from '../../models/json-payload';
import { emptyCVData } from '../../models/catalog';
import type { CVData } from '../../models/cv-data';

/** Exporta el estado completo del CV como un archivo .json descargable. */
@Injectable({ providedIn: 'root' })
export class JsonExporter {
  /** Construye el payload JSON del CV (datos + diseño por defecto). */
  buildJson(cv: CVData): string {
    return stringifyJson(cv, {
      templateId: 'folha',
      layoutId: 'single',
      paletteId: 'te-verde',
      customColors: null,
      sectionOrder: [],
      hiddenSections: [],
      photoShape: 'square',
      showWatermark: false,
      watermarkText: '',
    });
  }

  /** Descarga un texto JSON como archivo .json. */
  exportJson(json: string, name: string): void {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    this.download(blob, `${name}.json`);
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
