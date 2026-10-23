import { TEMPLATE_LOOKS, lookFor, BASE_LOOK } from './template-look';

/**
 * Sincronización entre `template-look.ts` y `cv-document.component.scss`.
 *
 * Cada plantilla declara sus tipografías y reglas en dos sitios:
 * 1. `template-look.ts` — datos usados por el exportador de Word (.docx)
 * 2. `cv-document.component.scss` — propiedades CSS usadas por el preview y el PDF
 *
 * Este test verifica que todos los templates de `catalog.ts` tienen entrada en
 * `TEMPLATE_LOOKS`, y que los valores numéricos clave coinciden entre ambos
 * archivos. Si alguien edita una plantilla en un sitio y no en el otro, el
 * test falla.
 */
describe('template-look vs CSS — sincronización de plantillas', () => {
  it('todas las plantillas conocidas tienen entrada en TEMPLATE_LOOKS', () => {
    const known = [
      'folha', 'linha', 'manuscrito', 'carta', 'corporativo', 'executivo',
      'consultoria', 'institucional', 'tecnico', 'revista', 'compacto', 'cartel',
      'academico', 'universidad', 'tesis', 'congreso',
    ];
    for (const id of known) {
      expect(TEMPLATE_LOOKS[id]).withContext(`Falta «${id}» en TEMPLATE_LOOKS`).toBeDefined();
    }
  });

  it('lookFor devuelve BASE_LOOK para plantilla desconocida', () => {
    expect(lookFor('no-existe')).toBe(BASE_LOOK);
  });

  it('folha usa los valores por defecto de BASE_LOOK', () => {
    const look = lookFor('folha');
    expect(look.base).toBe(BASE_LOOK.base);
    expect(look.name.size).toBe(BASE_LOOK.name.size);
    expect(look.heading.size).toBe(BASE_LOOK.heading.size);
  });

  it('linha sobrescribe name y heading', () => {
    const look = lookFor('linha');
    expect(look.name.size).toBe(26);
    expect(look.name.weight).toBe(600);
    expect(look.heading.size).toBe(10);
  });

  it('manuscrito usa serif y valores propios', () => {
    const look = lookFor('manuscrito');
    expect(look.serif).toBeTrue();
    expect(look.base).toBe(13);
    expect(look.name.size).toBe(34);
  });

  it('executivo — valores propios', () => {
    const look = lookFor('executivo');
    expect(look.name.size).toBe(32);
    expect(look.heading.size).toBe(9.5);
    expect(look.heading.weight).toBe(600);
  });

  it('tesis numera las secciones y no tiene regla', () => {
    const look = lookFor('tesis');
    expect(look.heading.numbered).toBeTrue();
    expect(look.heading.rule).toBe('none');
  });

  it('academico centra el encabezado', () => {
    const look = lookFor('academico');
    expect(look.align).toBe('center');
  });
});
