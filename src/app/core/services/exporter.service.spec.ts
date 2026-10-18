import { emptyCVData, PALETTES } from '../models/catalog';
import type { CVData } from '../models/cv-data';
import { ExporterService } from './exporter.service';

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
