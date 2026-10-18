import { normalizeCVData } from './cv-store.service';

/**
 * Whatever arrives from localStorage — or from an older version of the app —
 * has to come out as a complete, predictable shape: the editor binds these
 * fields straight to inputs, so a missing link must be `''`, never `undefined`
 * (it was painted as the literal word "undefined" inside the box).
 */
describe('normalizeCVData — enlaces de proyectos', () => {
  const first = (raw: unknown) => normalizeCVData({ projects: [raw] }).projects[0];

  it('migra el antiguo `url` único al enlace de la demo', () => {
    const p = first({ id: 'p1', name: 'Viejo', url: 'https://x.dev/' });
    expect(p.demoUrl).toBe('https://x.dev/');
    expect(p.repoUrl).toBe('');
    expect('url' in p).toBe(false);
  });

  it('deja los enlaces ausentes como cadena vacía', () => {
    const p = first({ id: 'p1', name: 'Nuevo' });
    expect(p.demoUrl).toBe('');
    expect(p.repoUrl).toBe('');
  });

  it('recorta los espacios y respeta los enlaces ya escritos', () => {
    const p = first({
      id: 'p1',
      name: 'Nuevo',
      demoUrl: '  https://demo.dev/  ',
      repoUrl: 'https://github.com/x/y',
    });
    expect(p.demoUrl).toBe('https://demo.dev/');
    expect(p.repoUrl).toBe('https://github.com/x/y');
  });

  it('no revienta con una entrada corrupta', () => {
    const p = first(null);
    expect(p.demoUrl).toBe('');
    expect(p.repoUrl).toBe('');
    expect(p.technologies).toEqual([]);
  });
});
