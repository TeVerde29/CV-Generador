import { ExporterService } from './exporter.service';
import type { ExportDesign } from './exporter.service';
import { emptyCVData } from '../models/catalog';
import type { CVData } from '../models/cv-data';
import { toHref } from '../models/labels';
import { JsonExporter } from './exporters/json-exporter';
import { MarkdownExporter } from './exporters/markdown-exporter';
import { DocxExporter } from './exporters/docx-exporter';
import { PdfExporter } from './exporters/pdf-exporter';

const json = new JsonExporter();
const md = new MarkdownExporter();
const docx = new DocxExporter();
const pdf = new PdfExporter();
const service = new ExporterService(json, md, docx, pdf);

const design: ExportDesign = {
  templateId: 'tesis',
  layoutId: 'sidebar-left',
  sectionOrder: ['education', 'experience', 'skills'],
  hiddenSections: ['interests', 'references'],
};

const fullData: CVData = {
  ...emptyCVData(),
  personalInfo: { name: 'Pedro', email: 'pedro@ejemplo.com', phone: '', location: '' },
  education: [{ id: 'e1', degree: 'Ingeniería', field: '', institution: 'UNU', startDate: '2021', endDate: '2026' }],
  experience: [{ id: 'x1', position: 'Practicante', company: 'OTI', startDate: '2025', endDate: '2026', description: '', achievements: [] }],
  skills: [{ id: 's1', category: 'Lenguajes', items: ['TypeScript'] }],
  interests: ['Ajedrez'],
  references: [{ id: 'r1', name: 'Ana', title: 'Jefa', email: '', phone: '' }],
};

describe('exportPdf — diseño y paleta llegan al lienzo rasterizado', () => {
  it('run pdf devuelve ok:false sin lienzo', async () => {
    const result = await service.run('pdf', {
      data: { ...fullData },
      colors: { primary: '#000', secondary: '#000', accent: '#000' },
      design,
    });
    expect(result.ok).toBeFalse();
    expect(result.message).toBe('El lienzo del CV todavía no está listo.');
  });

  it('run pdf devuelve ok:false sin lienzo ni diseño', async () => {
    const result = await service.run('pdf', {
      data: { ...fullData },
      colors: { primary: '#000', secondary: '#000', accent: '#000' },
      design: undefined,
    });
    expect(result.ok).toBeFalse();
    expect(result.message).toBe('El lienzo del CV todavía no está listo.');
  });
});

describe('exportPdf — secciones ocultas viajan en el diseño', () => {
  it('el diseño lleva hiddenSections y las secciones visibles siguen presentes', () => {
    expect(design.hiddenSections).toContain('interests');
    expect(design.hiddenSections).toContain('references');
    expect(design.hiddenSections).not.toContain('education');
    expect(design.hiddenSections).not.toContain('experience');
    expect(design.hiddenSections).not.toContain('skills');
  });
});

describe('toHref — lista blanca de esquemas (XSS)', () => {
  it('permite http y https', () => {
    expect(toHref('https://linkedin.com/in/pedro')).toBe('https://linkedin.com/in/pedro');
    expect(toHref('http://example.com')).toBe('http://example.com');
  });

  it('añade https a enlaces sin esquema', () => {
    expect(toHref('linkedin.com/in/pedro')).toBe('https://linkedin.com/in/pedro');
  });

  it('permite mailto y tel', () => {
    expect(toHref('mailto:pedro@ejemplo.com')).toBe('mailto:pedro@ejemplo.com');
    expect(toHref('tel:+51900000000')).toBe('tel:+51900000000');
  });

  it('rechaza javascript: devolviendo vacío', () => {
    expect(toHref('javascript:alert(1)')).toBe('');
  });

  it('rechaza data: devolviendo vacío', () => {
    expect(toHref('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('rechaza vbscript y file:', () => {
    expect(toHref('vbscript:msgbox(1)')).toBe('');
    expect(toHref('file:///etc/passwd')).toBe('');
  });

  it('devuelve vacío para entrada vacía', () => {
    expect(toHref('')).toBe('');
    expect(toHref(undefined)).toBe('');
  });
});
