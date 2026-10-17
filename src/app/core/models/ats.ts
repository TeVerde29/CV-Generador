/**
 * Keyword (ATS) analysis: scores a CV against a job offer, entirely offline.
 *
 * Nothing here touches the network or the AI. Reading the offer and counting
 * terms is free, instant and repeatable, so it can run on every keystroke,
 * while the AI optimisation — which spends tokens — stays a deliberate,
 * one-off action.
 *
 * The model is deliberately simple and explainable: a term either appears in
 * the CV or it does not, and every structural check states why it matters.
 * That is far more useful to a candidate than an opaque number.
 */

import type { CVData } from './cv-data';

/* ── Vocabulary filters ───────────────────────────────────────────────────── */

/** Grammatical words in Spanish and English: never a key term. */
const STOPWORDS = new Set([
  // Español
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'aquel', 'aquella',
  'aquellas', 'aquellos', 'aqui', 'asi', 'aun', 'cada', 'como', 'con', 'contra',
  'cual', 'cuales', 'cuando', 'de', 'del', 'demas', 'desde', 'donde', 'dos',
  'e', 'el', 'ella', 'ellas', 'ello', 'ellos', 'en', 'entre', 'era', 'eran',
  'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estan', 'estar',
  'estas', 'este', 'esto', 'estos', 'fue', 'fueron', 'ha', 'han', 'has',
  'hasta', 'he', 'hemos', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me',
  'mi', 'mis', 'mucho', 'muy', 'nada', 'ni', 'no', 'nos', 'nosotras',
  'nosotros', 'nuestra', 'nuestras', 'nuestro', 'nuestros', 'o', 'os', 'otra',
  'otras', 'otro', 'otros', 'para', 'pero', 'poco', 'por', 'porque', 'que',
  'quien', 'quienes', 'se', 'sea', 'segun', 'ser', 'si', 'sido', 'siendo',
  'sin', 'sobre', 'sois', 'somos', 'son', 'soy', 'su', 'sus', 'tal', 'tambien',
  'tan', 'te', 'tendra', 'tenemos', 'tener', 'tengo', 'ti', 'tiene', 'tienen',
  'todo', 'todos', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'vosotras',
  'vosotros', 'y', 'ya', 'yo',
  // English
  'about', 'after', 'all', 'also', 'an', 'and', 'any', 'are', 'as', 'at', 'be',
  'because', 'been', 'before', 'being', 'both', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'doing', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'her', 'here', 'hers', 'him',
  'his', 'how', 'into', 'is', 'it', 'its', 'just', 'me', 'more', 'most', 'my',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'will', 'with', 'would', 'you', 'your', 'yours',
]);

/**
 * Recruiting boilerplate: it shows up in almost every ad, so matching it says
 * nothing about the profile. Keeping it out stops the score from being diluted
 * by words no recruiter ever searches for.
 */
const NOISE = new Set([
  'acerca', 'ademas', 'adjunta', 'adjuntar', 'am', 'anual', 'anos', 'area',
  'av', 'beneficio', 'beneficios', 'bruto', 'busca', 'buscamos', 'candidato',
  'candidata', 'colaborar', 'competitivo', 'conocimiento', 'conocimientos',
  'contrato', 'cv', 'demostrable', 'deseable', 'dia', 'dias', 'disenar',
  'dpto', 'ej', 'empresa', 'equipo', 'etc', 'experiencia', 'flexible',
  'funcion', 'funciones', 'hibrido', 'horario', 'id', 'if', 'imprescindible',
  'incorporacion', 'indefinido', 'jornada', 'mantener', 'meses', 'nivel',
  'oferta', 'ofrecemos', 'ok', 'perfil', 'persona', 'personas', 'pm', 'puesto',
  'remoto', 'requisito', 'requisitos', 'responsabilidad', 'responsabilidades',
  'salario', 'sector', 'semana', 'sr', 'sra', 'talento', 'telefono', 'us',
  'valora', 'valorable', 'valoramos', 'valorar', 'vs',
  'ability', 'able', 'benefits', 'candidate', 'company', 'days', 'join',
  'looking', 'offer', 'opportunity', 'requirements', 'responsibilities',
  'role', 'salary', 'seeking', 'skills', 'team', 'teams', 'work', 'working',
  'years',
]);

/* ── Results ──────────────────────────────────────────────────────────────── */

export interface KeywordHit {
  /** Normalised term, used for matching. */
  term: string;
  /** Term as it was first written in the offer. */
  label: string;
  /** Relative importance, derived from how often the offer repeats it. */
  weight: number;
  /** How many times the offer mentions it. */
  occurrences: number;
  /** Whether the CV already covers it. */
  found: boolean;
}

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  /** What to do about it, in the reader's own terms. */
  detail: string;
  weight: number;
}

export interface AtsReport {
  /** 0–100, keywords and structure combined. */
  score: number;
  /** 0–100, how much of the offer's vocabulary the CV covers. */
  keywordScore: number;
  /** 0–100, points earned on the structural checklist. */
  structureScore: number;
  keywords: KeywordHit[];
  matched: KeywordHit[];
  missing: KeywordHit[];
  checks: AtsCheck[];
  verdict: { label: string; tone: 'ok' | 'warn' | 'bad' };
}

/* ── Text helpers ─────────────────────────────────────────────────────────── */

/** Diacritics are dropped so "atención" and "atencion" compare equal. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Matches one term at a time, keeping `+`, `#`, `.`, `/` and `-` inside it so
 * `c++`, `c#`, `node.js`, `ci/cd` and `scikit-learn` stay whole, while commas,
 * brackets and sentence dots fall outside. Case and accents are preserved, so a
 * match can be shown to the reader exactly as the offer wrote it.
 */
const TERM_RE = /[\p{L}\p{N}][\p{L}\p{N}+#]*(?:[./-][\p{L}\p{N}][\p{L}\p{N}+#]*)*/gu;

interface Token {
  /** Folded form, used for matching. */
  term: string;
  /** Original form, shown to the reader. */
  label: string;
}

/**
 * Term and label come out of the same match, so they can never drift apart:
 * the folded form is what gets compared, the original is what gets displayed.
 */
function tokenizeLabeled(text: string): Token[] {
  const tokens: Token[] = [];
  for (const label of text.match(TERM_RE) ?? []) {
    if (label.length >= 2) tokens.push({ term: fold(label), label });
  }
  return tokens;
}

function tokenize(text: string): string[] {
  return tokenizeLabeled(text).map((token) => token.term);
}

function isUseful(token: string): boolean {
  return token.length >= 2 && !STOPWORDS.has(token) && !NOISE.has(token) && !/^\d+$/.test(token);
}

/** Every string in the CV, so a term can be searched anywhere in the document. */
function cvStrings(cv: CVData): string[] {
  const parts: (string | undefined)[] = [
    cv.summary,
    cv.personalInfo.name,
    cv.personalInfo.title,
    cv.personalInfo.location,
    ...cv.interests,
  ];
  for (const item of cv.experience) {
    parts.push(item.position, item.company, item.description, ...item.achievements);
  }
  for (const item of cv.education) parts.push(item.degree, item.institution, item.field);
  for (const group of cv.skills) parts.push(group.category, ...group.items);
  for (const item of cv.languages) parts.push(item.language);
  for (const item of cv.projects) {
    parts.push(item.name, item.description, ...item.technologies);
  }
  for (const item of cv.certifications) parts.push(item.name, item.issuer);
  for (const item of cv.publications) parts.push(item.title, item.publisher, item.description);
  for (const item of cv.volunteerWork) {
    parts.push(item.role, item.organization, item.description);
  }
  for (const item of cv.awards) parts.push(item.title, item.issuer, item.description);
  return parts.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

/* ── Keyword extraction ───────────────────────────────────────────────────── */

interface Candidate {
  term: string;
  label: string;
  occurrences: number;
}

/**
 * Multi-word skills worth flagging even when the ad only says them once: they
 * are exactly what a keyword filter looks for, and the surrounding prose would
 * never produce them on its own. Guessing pairs automatically was tried and
 * dropped: Spanish prepositions break them (gestión "de" incidencias) and the
 * survivors were noise like "Python SQL".
 */
const PHRASES = [
  'machine learning',
  'deep learning',
  'data science',
  'data engineering',
  'data quality',
  'business intelligence',
  'computer vision',
  'natural language processing',
  'big data',
  'power bi',
  'ci/cd',
  'unit testing',
  'clean code',
  'scrum master',
  'product owner',
];

function collectCandidates(offer: string): Candidate[] {
  const tokens = tokenizeLabeled(offer);
  const normalized = ` ${tokens.map((token) => token.term).join(' ')} `;
  const unigrams = new Map<string, { count: number; label: string }>();

  for (const { term, label } of tokens) {
    if (!isUseful(term)) continue;
    const seen = unigrams.get(term);
    if (seen) seen.count += 1;
    else unigrams.set(term, { count: 1, label });
  }

  const candidates: Candidate[] = [];

  // A curated phrase already stands for its own words, so a word whose every
  // occurrence sits inside one is suppressed: with "machine learning" and "deep
  // learning" the offer should not also list a bare "learning". Occurrences are
  // summed across phrases, because a word can be shared by several of them.
  const phrases: { term: string; words: string[]; occurrences: number }[] = [];
  for (const phrase of PHRASES) {
    const term = tokenize(phrase).join(' ');
    if (!term.includes(' ')) continue;
    const occurrences = normalized.split(` ${term} `).length - 1;
    if (occurrences > 0) phrases.push({ term, words: term.split(' '), occurrences });
  }

  const insidePhrases = new Map<string, number>();
  for (const phrase of phrases) {
    for (const word of phrase.words) {
      insidePhrases.set(word, (insidePhrases.get(word) ?? 0) + phrase.occurrences);
    }
  }

  const absorbed = new Set<string>();
  for (const [word, inside] of insidePhrases) {
    if ((unigrams.get(word)?.count ?? 0) <= inside) absorbed.add(word);
  }

  for (const [term, { count, label }] of unigrams) {
    if (!absorbed.has(term)) candidates.push({ term, label, occurrences: count });
  }
  for (const phrase of phrases) {
    candidates.push({ term: phrase.term, label: phrase.term, occurrences: phrase.occurrences });
  }
  return candidates;
}

/** Longer terms and repeated terms weigh more, and phrases beat single words. */
function weightOf(candidate: Candidate): number {
  const isPhrase = candidate.term.includes(' ');
  return (1 + Math.log(1 + candidate.occurrences)) * (isPhrase ? 1.4 : 1);
}

export function extractKeywords(offer: string, limit = 40): KeywordHit[] {
  return collectCandidates(offer)
    .map((candidate) => ({
      term: candidate.term,
      label: candidate.label,
      occurrences: candidate.occurrences,
      weight: weightOf(candidate),
      found: false,
    }))
    .sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term))
    .slice(0, limit);
}

/* ── Structural checklist ─────────────────────────────────────────────────── */

function countQuantified(cv: CVData): number {
  return cv.experience.reduce(
    (total, item) => total + item.achievements.filter((line) => /\d/.test(line)).length,
    0,
  );
}

function buildChecks(cv: CVData): AtsCheck[] {
  const info = cv.personalInfo;
  const skillCount = cv.skills.reduce((total, group) => total + group.items.length, 0);
  const experienceWithDates = cv.experience.filter((item) => item.startDate.trim()).length;
  const quantified = countQuantified(cv);
  const hasLink = Boolean(info.linkedin?.trim() || info.github?.trim() || info.portfolio?.trim());

  return [
    {
      id: 'contact',
      label: 'Datos de contacto completos',
      passed: Boolean(info.email.trim() && info.phone.trim()),
      detail: 'Correo y teléfono: los dos primeros campos que lee cualquier sistema.',
      weight: 15,
    },
    {
      id: 'location',
      label: 'Ubicación indicada',
      passed: Boolean(info.location.trim()),
      detail: 'Muchos filtros descartan por ciudad o país antes de llegar a una persona.',
      weight: 8,
    },
    {
      id: 'links',
      label: 'Enlace profesional',
      passed: hasLink,
      detail: 'Añade LinkedIn, GitHub o un portafolio en los datos personales.',
      weight: 8,
    },
    {
      id: 'summary',
      label: 'Perfil profesional con sustancia',
      passed: cv.summary.trim().length >= 200,
      detail: 'Un perfil de 200 caracteres o más coloca tu vocabulario al principio del documento.',
      weight: 12,
    },
    {
      id: 'dates',
      label: 'Experiencia con fechas',
      passed: cv.experience.length > 0 && experienceWithDates === cv.experience.length,
      detail: 'Cada puesto necesita fecha de inicio: sin ellas el sistema no puede calcular tu trayectoria.',
      weight: 15,
    },
    {
      id: 'quantified',
      label: 'Logros con cifras',
      passed: quantified >= 3,
      detail: 'Al menos tres viñetas con números (porcentajes, importes, volúmenes).',
      weight: 12,
    },
    {
      id: 'skills',
      label: 'Competencias declaradas',
      passed: skillCount >= 5,
      detail: 'Cinco competencias o más: es la sección que más se compara con la oferta.',
      weight: 12,
    },
    {
      id: 'education',
      label: 'Formación indicada',
      passed: cv.education.length > 0,
      detail: 'Aunque sea un curso, la formación suele ser un filtro obligatorio.',
      weight: 10,
    },
    {
      id: 'languages',
      label: 'Idiomas indicados',
      passed: cv.languages.length > 0,
      detail: 'Indica el nivel de cada idioma: es un filtro habitual, sobre todo en inglés.',
      weight: 8,
    },
  ];
}

/* ── Report ───────────────────────────────────────────────────────────────── */

function verdictFor(score: number): AtsReport['verdict'] {
  if (score >= 80) return { label: 'Muy encajado', tone: 'ok' };
  if (score >= 65) return { label: 'Buen encaje', tone: 'ok' };
  if (score >= 45) return { label: 'Mejorable', tone: 'warn' };
  return { label: 'Poco encajado', tone: 'bad' };
}

/**
 * Analyses the offer against the CV. Both sides are normalised the same way,
 * so accents, case and punctuation never cause a false "missing".
 */
export function analyzeOffer(offer: string, cv: CVData): AtsReport {
  const cvTokenList = cvStrings(cv).flatMap((value) => tokenize(value));
  const cvBag = new Set(cvTokenList);
  const cvText = ` ${cvTokenList.join(' ')} `;

  const keywords = extractKeywords(offer).map((keyword) => ({
    ...keyword,
    found: keyword.term.includes(' ')
      ? cvText.includes(` ${keyword.term} `)
      : cvBag.has(keyword.term),
  }));

  const totalWeight = keywords.reduce((sum, keyword) => sum + keyword.weight, 0);
  const foundWeight = keywords
    .filter((keyword) => keyword.found)
    .reduce((sum, keyword) => sum + keyword.weight, 0);

  const checks = buildChecks(cv);
  const checksWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks
    .filter((check) => check.passed)
    .reduce((sum, check) => sum + check.weight, 0);

  const keywordScore = totalWeight > 0 ? Math.round((foundWeight / totalWeight) * 100) : 0;
  const structureScore = checksWeight > 0 ? Math.round((earned / checksWeight) * 100) : 0;
  const score = Math.round(keywordScore * 0.6 + structureScore * 0.4);

  return {
    score,
    keywordScore,
    structureScore,
    keywords,
    matched: keywords.filter((keyword) => keyword.found),
    missing: keywords.filter((keyword) => !keyword.found),
    checks,
    verdict: verdictFor(score),
  };
}
