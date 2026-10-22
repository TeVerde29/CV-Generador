import JSZip from 'jszip';
import { emptyCVData, PALETTES } from '../models/catalog';
import type { CVData } from '../models/cv-data';
import { docxLook } from './docx-look';
import { ExporterService, type ExportDesign } from './exporter.service';

/**
 * The Markdown export is the one that can be asserted without a DOM, and it is
 * the canary for the Word one: both read the same `ProjectItem` links and the
 * same contact list, so a regression in either shows up here first.
 */
const cv = (patch: Partial<CVData>): CVData => ({ ...emptyCVData(), ...patch });

const service = new ExporterService();

describe('buildMarkdown — datos de contacto', () => {
  it('deja el correo, el teléfono y la ciudad como texto plano', () => {
    const md = service.buildMarkdown(
      cv({
        personalInfo: {
          name: 'Pedro',
          email: 'pedro@ejemplo.com',
          phone: '+51 900 000 000',
          location: 'Pucallpa, Perú',
        },
      }),
    );
    expect(md).toContain('pedro@ejemplo.com');
    expect(md).toContain('+51 900 000 000');
    expect(md).toContain('Pucallpa, Perú');
  });

  it('escribe los enlaces del perfil con su nombre, no con la URL', () => {
    const md = service.buildMarkdown(
      cv({
        personalInfo: {
          name: 'Pedro',
          email: '',
          phone: '',
          location: '',
          linkedin: 'linkedin.com/in/pedro',
          github: 'https://github.com/TeVerde29',
          portfolio: 'teverde29.github.io/Portafolio/',
        },
      }),
    );
    expect(md).toContain('[LinkedIn](https://linkedin.com/in/pedro)');
    expect(md).toContain('[GitHub](https://github.com/TeVerde29)');
    expect(md).toContain('[Portafolio](https://teverde29.github.io/Portafolio/)');
    // La URL cruda no debe aparecer suelta en la cabecera.
    expect(md).not.toContain('linkedin.com/in/pedro ·');
  });

  it('no repite el esquema cuando el enlace ya lo trae', () => {
    const md = service.buildMarkdown(
      cv({
        personalInfo: { name: 'Pedro', email: '', phone: '', location: '', github: 'https://github.com/x' },
      }),
    );
    expect(md).toContain('[GitHub](https://github.com/x)');
    expect(md).not.toContain('https://https://');
  });

  it('omite los enlaces vacíos en lugar de dejar un hueco', () => {
    const md = service.buildMarkdown(
      cv({
        personalInfo: { name: 'Pedro', email: 'a@b.co', phone: '', location: '', website: '   ' },
      }),
    );
    expect(md).not.toContain('[Web]');
    expect(md).not.toContain(']()');
  });
});

describe('buildMarkdown — proyectos', () => {
  const project = (demoUrl?: string, repoUrl?: string) => ({
    id: 'p1',
    name: 'Proyecto',
    description: 'Una descripción.',
    technologies: ['Angular'],
    demoUrl,
    repoUrl,
  });

  it('publica la demo y el repositorio como enlaces con nombre', () => {
    const md = service.buildMarkdown(
      cv({ projects: [project('https://demo.dev/', 'https://github.com/x/y')] }),
    );
    expect(md).toContain('[Demo](https://demo.dev/) · [GitHub](https://github.com/x/y)');
  });

  it('admite proyectos con un solo enlace', () => {
    const md = service.buildMarkdown(cv({ projects: [project(undefined, 'github.com/x/y')] }));
    expect(md).toContain('[GitHub](https://github.com/x/y)');
    expect(md).not.toContain('[Demo]');
  });

  it('no imprime nada cuando el proyecto no tiene enlaces', () => {
    const md = service.buildMarkdown(cv({ projects: [project()] }));
    expect(md).toContain('### Proyecto');
    expect(md).not.toContain('[Demo]');
    expect(md).not.toContain('[GitHub]');
  });
});

/**
 * The Word file is built by `docx`, which throws when a hyperlink is not
 * well-formed. Generating one for real is the only way to know the run succeeds
 * — and it catches the scheme-less links, which Word rejects.
 */
describe('run — Word', () => {
  const full = cv({
    personalInfo: {
      name: 'Pedro',
      email: 'pedro@ejemplo.com',
      phone: '+51 900 000 000',
      location: 'Pucallpa, Perú',
      linkedin: 'linkedin.com/in/pedro',
      github: 'github.com/TeVerde29',
      portfolio: 'teverde29.github.io/Portafolio/',
    },
    projects: [
      {
        id: 'p1',
        name: 'Proyecto',
        description: 'Una descripción.',
        technologies: ['Angular'],
        demoUrl: 'demo.dev',
        repoUrl: 'https://github.com/x/y',
      },
    ],
  });

  const run = () =>
    service.run('docx', {
      data: full,
      colors: PALETTES[0].colors,
      templateName: 'Folha',
    });

  it('genera el documento con enlaces de contacto y de proyecto', async () => {
    const result = await run();
    expect(result.ok).withContext(result.message).toBe(true);
    expect(result.message).toContain('.docx');
  });

  it('acepta un CV sin ningún enlace', async () => {
    const result = await service.run('docx', {
      data: cv({
        personalInfo: { name: 'Pedro', email: 'a@b.co', phone: '', location: '' },
      }),
      colors: PALETTES[0].colors,
      templateName: 'Folha',
    });
    expect(result.ok).withContext(result.message).toBe(true);
  });
});

/**
 * The bug this covers: the Word file came out in Calibri with Word's own blue
 * headings whatever the user had picked, so the downloaded document looked
 * nothing like the preview. The package is opened here and searched for the
 * design that went in — the only way to catch a regression the preview hides.
 */
describe('buildDocx — el diseño elegido llega al Word', () => {
  const colors = PALETTES[0].colors; // Té verde: primario #294635
  const data = cv({
    personalInfo: { name: 'Pedro', email: 'a@b.co', phone: '', location: '' },
    summary: 'Resumen de perfil.',
    experience: [
      {
        id: 'x1',
        position: 'Practicante',
        company: 'OTI',
        startDate: '2025',
        endDate: '2026',
        description: '',
        achievements: ['Una tarea'],
      },
    ],
    education: [
      {
        id: 'e1',
        degree: 'Ingeniería',
        field: 'de Sistemas',
        institution: 'UNU',
        startDate: '2021',
        endDate: '2026',
      },
    ],
    skills: [{ id: 's1', category: 'Lenguajes', items: ['TypeScript', 'Java'] }],
    interests: ['Ajedrez', 'Cine'],
  });

  /** Word splits the file into a zip; the body lives in `document.xml`. */
  const documentXml = async (design?: ExportDesign): Promise<string> => {
    const blob = await service.buildDocx(data, colors, undefined, undefined, design);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const file = zip.file('word/document.xml');
    if (!file) throw new Error('El paquete no trae word/document.xml');
    return file.async('string');
  };

  /** The `<w:p>` block that holds a text, so its own properties can be read. */
  const paragraphOf = (xml: string, needle: string): string => {
    const at = xml.indexOf(needle);
    if (at < 0) throw new Error(`No se encontró «${needle}» en el documento`);
    const open = xml.lastIndexOf('<w:p>', at);
    const close = xml.indexOf('</w:p>', at);
    if (open < 0 || close < 0) throw new Error(`No se pudo aislar el párrafo de «${needle}»`);
    return xml.slice(open, close);
  };

  it('usa la serif de la plantilla (Académico)', async () => {
    const xml = await documentXml({ templateId: 'academico', layoutId: 'single', sectionOrder: [] });
    expect(xml).toContain('w:ascii="Georgia"');
  });

  it('usa la monoespaciada de la plantilla Técnico', async () => {
    const xml = await documentXml({ templateId: 'tecnico', layoutId: 'single', sectionOrder: [] });
    expect(xml).toContain('w:ascii="Consolas"');
  });

  it('pinta con la paleta elegida y no con el azul de Word', async () => {
    const xml = (await documentXml({ templateId: 'folha', layoutId: 'single', sectionOrder: [] }))
      .toUpperCase();
    expect(xml).toContain('14532D');
    expect(xml).not.toContain('2F5496');
  });

  it('centra la cabecera y los títulos, y deja el cuerpo a la izquierda', async () => {
    const xml = await documentXml({ templateId: 'academico', layoutId: 'single', sectionOrder: [] });
    // El otro extremo del fallo: centrar el documento entero porque Académico
    // centra su cabecera. En la vista previa solo se centran la cabecera y los
    // títulos; el resumen y las fichas siguen a la izquierda.
    expect(paragraphOf(xml, 'Pedro')).toContain('w:val="center"');
    expect(paragraphOf(xml, 'Resumen de perfil.')).not.toContain('w:val="center"');
    expect(paragraphOf(xml, 'Practicante')).not.toContain('w:val="center"');
    expect(paragraphOf(xml, 'Lenguajes:')).not.toContain('w:val="center"');
  });

  it('escribe las secciones en el orden del preview', async () => {
    const xml = await documentXml({
      templateId: 'tesis',
      layoutId: 'single',
      sectionOrder: ['education', 'interests', 'summary', 'experience', 'skills'],
    });
    const education = xml.indexOf('Formación Académica');
    const interests = xml.indexOf('Intereses');
    const summary = xml.indexOf('Perfil profesional');
    expect(education).toBeGreaterThan(-1);
    expect(education).toBeLessThan(interests);
    expect(interests).toBeLessThan(summary);
  });

  it('numera las secciones solo en la plantilla Tesis', async () => {
    const numbered = await documentXml({ templateId: 'tesis', layoutId: 'single', sectionOrder: [] });
    // Solo cuentan las secciones con contenido: perfil, experiencia, formación,
    // competencias e intereses.
    expect(numbered).toContain('1. Perfil profesional');
    expect(numbered).toContain('5. Intereses');

    const plain = await documentXml({ templateId: 'folha', layoutId: 'single', sectionOrder: [] });
    expect(plain).not.toContain('1. PERFIL PROFESIONAL');
  });

  it('pone la barra lateral primero, como en la pantalla', async () => {
    const xml = (
      await documentXml({ templateId: 'folha', layoutId: 'sidebar-left', sectionOrder: [] })
    ).toUpperCase();
    expect(xml.indexOf('HABILIDADES Y COMPETENCIAS')).toBeLessThan(xml.indexOf('PERFIL PROFESIONAL'));
  });
});

describe('docxLook — de CSS a unidades de Word', () => {
  const colors = PALETTES.find((p) => p.id === 'pizarra')!.colors;

  it('convierte px a medios puntos, twips y múltiplos de línea', () => {
    const look = docxLook('folha', colors);
    expect(look.bodySize).toBe(19); // 12,6 px → 9,45 pt → 19 medios puntos
    expect(look.padX).toBe(600); // 40 px → 30 pt → 600 twips
    expect(look.line).toBe(372); // 1,55 × 240
  });

  it('la plantilla decide la tipografía, la caja y el color del título', () => {
    expect(docxLook('manuscrito', colors).bodyFont).toBe('Georgia');
    expect(docxLook('tecnico', colors).accentFont).toBe('Consolas');
    expect(docxLook('linha', colors).heading.color).toBe(docxLook('linha', colors).ink);
    expect(docxLook('tecnico', colors).heading.color).toBe('0EA5E9');
  });

  it('Tesis numera las secciones y Consultoría lleva barra de acento', () => {
    expect(docxLook('tesis', colors).heading.numbered).toBe(true);
    expect(docxLook('consultoria', colors).heading.edge).toBe(true);
  });
});
