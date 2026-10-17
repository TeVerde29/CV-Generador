import { analyzeOffer, extractKeywords } from './ats';
import { emptyCVData, SAMPLE_CV_DATA } from './catalog';

/** The same normalisation the analyser applies, so the invariant can be checked. */
const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const terms = (offer: string): string[] => extractKeywords(offer).map((hit) => hit.term);

describe('extractKeywords', () => {
  it('muestra cada término tal como lo escribió la oferta, sin puntuación', () => {
    const hits = extractKeywords('Requisitos: Python, SQL y Spark.');
    expect(hits.find((hit) => hit.term === 'python')?.label).toBe('Python');
    expect(hits.find((hit) => hit.term === 'spark')?.label).toBe('Spark');
  });

  it('mantiene término y etiqueta sincronizados', () => {
    // La etiqueta se tomaba de un array distinto al de los términos y las dos
    // listas se desalineaban, así que se mostraban palabras que no eran.
    const hits = extractKeywords('Buscamos una persona con Python, SQL y Spark para el equipo.');
    for (const hit of hits) expect(fold(hit.label)).toBe(hit.term);
  });

  it('descarta palabras vacías y relleno de anuncio', () => {
    const found = terms(
      'Buscamos una persona para el equipo con experiencia demostrable y salario competitivo.',
    );
    expect(found).not.toContain('y');
    expect(found).not.toContain('persona');
    expect(found).not.toContain('equipo');
    expect(found).not.toContain('experiencia');
    expect(found).not.toContain('salario');
  });

  it('conserva los términos que llevan símbolos', () => {
    const found = terms('Node.js, C++, C# y CI/CD');
    expect(found).toContain('node.js');
    expect(found).toContain('c++');
    expect(found).toContain('c#');
    expect(found).toContain('ci/cd');
  });

  it('reconoce las expresiones compuestas y absorbe sus palabras sueltas', () => {
    const found = terms('Valorable machine learning y deep learning.');
    expect(found).toContain('machine learning');
    expect(found).not.toContain('machine');
    expect(found).not.toContain('learning');
  });

  it('deja la palabra suelta cuando también aparece fuera de la expresión', () => {
    const found = terms('data science y data quality, todo sobre data.');
    expect(found).toContain('data science');
    expect(found).toContain('data');
  });
});

describe('analyzeOffer', () => {
  const withSkills = (items: string[]) => {
    const cv = emptyCVData();
    cv.skills = [{ id: 's1', category: 'Técnicas', items }];
    return cv;
  };

  it('reparte los términos entre cubiertos y ausentes', () => {
    const report = analyzeOffer('Se busca perfil con Python, SQL y Kafka.', withSkills(['Python', 'SQL']));
    expect(report.matched.map((hit) => hit.term)).toContain('python');
    expect(report.missing.map((hit) => hit.term)).toContain('kafka');
  });

  it('ignora acentos y mayúsculas al comparar', () => {
    const cv = withSkills(['Atención al detalle']);
    const report = analyzeOffer('Se valora mucho la atencion al detalle.', cv);
    expect(report.matched.map((hit) => hit.term)).toContain('atencion');
  });

  it('no da por cubierto un término que solo vive dentro de otra palabra', () => {
    const report = analyzeOffer('Requisitos: Java y Kafka.', withSkills(['JavaScript']));
    expect(report.matched.map((hit) => hit.term)).not.toContain('java');
  });

  it('deja la nota siempre entre 0 y 100', () => {
    const report = analyzeOffer('Perfil con Python y SQL.', SAMPLE_CV_DATA);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('pondera el vocabulario un 60 % y la estructura un 40 %', () => {
    const report = analyzeOffer('Se busca perfil con Python y SQL.', SAMPLE_CV_DATA);
    expect(report.score).toBe(Math.round(report.keywordScore * 0.6 + report.structureScore * 0.4));
  });

  it('no aprueba ninguna comprobación con el CV vacío', () => {
    const report = analyzeOffer('Se busca perfil con Python y SQL.', emptyCVData());
    expect(report.score).toBe(0);
    expect(report.structureScore).toBe(0);
    expect(report.missing.length).toBe(report.keywords.length);
    expect(report.verdict.tone).toBe('bad');
    expect(report.checks.every((check) => !check.passed)).toBe(true);
  });

  it('aprueba la revisión estructural con el CV de ejemplo', () => {
    const report = analyzeOffer('Se busca perfil con Python y SQL.', SAMPLE_CV_DATA);
    expect(report.structureScore).toBe(100);
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });
});
