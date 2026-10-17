import type {
  CVData,
  LayoutOption,
  PaletteOption,
  TemplateOption,
} from './cv-data';

/* ── Templates ─────────────────────────────────────────────────────────── */

export const TEMPLATES: TemplateOption[] = [
  { id: 'folha', name: 'Folha', family: 'Essencial', voice: 'sans', description: 'Sóbrio, aireado, sin adornos. El más neutro.' },
  { id: 'linha', name: 'Linha', family: 'Essencial', voice: 'sans', description: 'Reglas finas y jerarquía estricta.' },
  { id: 'manuscrito', name: 'Manuscrito', family: 'Essencial', voice: 'serif', description: 'Serif cálida, ritmo de imprenta.' },
  { id: 'corporativo', name: 'Corporativo', family: 'Corporativo', voice: 'sans', description: 'Formato clásico de reclutamiento.' },
  { id: 'executivo', name: 'Executivo', family: 'Corporativo', voice: 'serif', description: 'Mayúsculas espaciadas y peso bajo el título.' },
  { id: 'consultoria', name: 'Consultoría', family: 'Corporativo', voice: 'serif', description: 'Bloque denso, orientado a resultados.' },
  { id: 'tecnico', name: 'Técnico', family: 'Criativo', voice: 'mono', description: 'Monoespaciada, aire de especificación.' },
  { id: 'revista', name: 'Revista', family: 'Criativo', voice: 'mixed', description: 'Editorial, con acentos de color.' },
  { id: 'compacto', name: 'Compacto', family: 'Criativo', voice: 'sans', description: 'Aprovecha cada línea de la página.' },
  { id: 'academico', name: 'Académico', family: 'Académico', voice: 'serif', description: 'Cursivas y estructura de publicación.' },
  { id: 'universidad', name: 'Universidad', family: 'Académico', voice: 'serif', description: 'Estilo de servicio de carreras.' },
  { id: 'tesis', name: 'Tesis', family: 'Académico', voice: 'serif', description: 'Formal, con numeración sobria.' },
];

export const TEMPLATE_FAMILIES: TemplateOption['family'][] = [
  'Essencial',
  'Corporativo',
  'Criativo',
  'Académico',
];

/* ── Layouts ───────────────────────────────────────────────────────────── */

export const LAYOUTS: LayoutOption[] = [
  { id: 'single', name: 'Una columna', hint: 'Lectura de arriba a abajo' },
  { id: 'sidebar-left', name: 'Barra izquierda', hint: 'Datos de contacto a la izquierda' },
  { id: 'sidebar-right', name: 'Barra derecha', hint: 'Datos de contacto a la derecha' },
  { id: 'two-column', name: 'Dos columnas', hint: 'Contenido repartido en dos bloques' },
];

/* ── Palettes ──────────────────────────────────────────────────────────── */

export const PALETTES: PaletteOption[] = [
  { id: 'te-verde', name: 'Té verde', colors: { primary: '#294635', secondary: '#4f7256', accent: '#829b78' } },
  { id: 'matcha', name: 'Matcha', colors: { primary: '#294635', secondary: '#829b78', accent: '#afc49a' } },
  { id: 'salvia', name: 'Salvia', colors: { primary: '#3f5136', secondary: '#6b7f5e', accent: '#a9bd94' } },
  { id: 'tinta', name: 'Tinta', colors: { primary: '#18181b', secondary: '#71717a', accent: '#3f3f46' } },
  { id: 'pizarra', name: 'Pizarra', colors: { primary: '#1f2937', secondary: '#6b7280', accent: '#0ea5e9' } },
  { id: 'océano', name: 'Océano', colors: { primary: '#0c4a6e', secondary: '#0e7490', accent: '#06b6d4' } },
  { id: 'bosque', name: 'Bosque', colors: { primary: '#14532d', secondary: '#15803d', accent: '#22c55e' } },
  { id: 'oliva', name: 'Oliva', colors: { primary: '#3f4a1c', secondary: '#6b7a3a', accent: '#a3b565' } },
  { id: 'terracota', name: 'Terracota', colors: { primary: '#7c2d12', secondary: '#c2410c', accent: '#fb923c' } },
  { id: 'vino', name: 'Vino', colors: { primary: '#5b1720', secondary: '#9f1239', accent: '#fb7185' } },
  { id: 'mostaza', name: 'Mostaza', colors: { primary: '#713f12', secondary: '#b45309', accent: '#fbbf24' } },
  { id: 'índigo', name: 'Índigo', colors: { primary: '#312e81', secondary: '#4f46e5', accent: '#a5b4fc' } },
  { id: 'ciruela', name: 'Ciruela', colors: { primary: '#4a1d5f', secondary: '#7e22ce', accent: '#c4b5fd' } },
  { id: 'grafito', name: 'Grafito', colors: { primary: '#1c1917', secondary: '#44403c', accent: '#78716c' } },
  { id: 'monocromo', name: 'Monocromo', colors: { primary: '#000000', secondary: '#525252', accent: '#a3a3a3' } },
];

export const DEFAULT_TEMPLATE_ID = 'folha';
export const DEFAULT_LAYOUT_ID: LayoutOption['id'] = 'single';
export const DEFAULT_PALETTE_ID = 'te-verde';

/* ── Empty & sample data ───────────────────────────────────────────────── */

export function emptyCVData(): CVData {
  return {
    personalInfo: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    publications: [],
    volunteerWork: [],
    awards: [],
    interests: [],
  };
}

export const SAMPLE_CV_DATA: CVData = {
  personalInfo: {
    name: 'Alejandra Ruíz',
    title: 'Ingeniera de Datos',
    email: 'alejandra.ruiz@correo.com',
    phone: '+34 611 22 33 44',
    location: 'Valencia, España',
    website: 'https://alejandraruiz.dev',
    linkedin: 'linkedin.com/in/alejandraruiz',
    github: 'github.com/aruiz',
    portfolio: '',
  },
  summary:
    'Ingeniera de datos con ocho años construyendo plataformas analíticas para equipos de producto. Especializada en modelado dimensional, orquestación de pipelines y reducción de coste en almacenamiento. Disfruto traduciendo preguntas de negocio en modelos que la organización entiende y mantiene.',
  experience: [
    {
      id: 'exp-1',
      company: 'Mercado Central',
      position: 'Ingeniera de Datos Senior',
      startDate: 'mar 2021',
      endDate: 'Actualidad',
      description:
        'Responsable de la capa analítica que alimenta los cuadros de mando de operaciones y finanzas.',
      achievements: [
        'Rediseñé el modelo dimensional de pedidos y reduje el tiempo de consulta un 62 %',
        'Orquesté 140 pipelines diarios con Airflow y eliminé las ejecuciones fallidas recurrentes',
        'Negocié la migración a almacenamiento en columnas y bajé el coste mensual un 35 %',
      ],
    },
    {
      id: 'exp-2',
      company: 'Estudio Bravo',
      position: 'Analista de Datos',
      startDate: 'ene 2018',
      endDate: 'feb 2021',
      description:
        'Primer perfil de datos de la empresa; construí la base de reporting desde cero.',
      achievements: [
        'Puse en marcha el almacén de datos y las definiciones compartidas de métricas',
        'Automaticé los informes semanales y liberé 12 horas de trabajo manual al mes',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Universitat Politècnica de València',
      degree: 'Grado en Ingeniería Informática',
      field: 'Sistemas de Información',
      startDate: '2013',
      endDate: '2017',
      gpa: '8,4 / 10',
    },
  ],
  skills: [
    { id: 'sk-1', category: 'Datos', items: ['SQL', 'dbt', 'Modelado dimensional', 'Airflow'] },
    { id: 'sk-2', category: 'Plataforma', items: ['Python', 'Docker', 'BigQuery', 'Terraform'] },
    { id: 'sk-3', category: 'Transversales', items: ['Documentación', 'Mentoría', 'Trabajo asíncrono'] },
  ],
  languages: [
    { id: 'lang-1', language: 'Español', proficiency: 'native' },
    { id: 'lang-2', language: 'Inglés', proficiency: 'fluent' },
    { id: 'lang-3', language: 'Portugués', proficiency: 'intermediate' },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Catálogo de métricas',
      description:
        'Repositorio único de definiciones de negocio, versionado y con pruebas automáticas.',
      technologies: ['dbt', 'SQL', 'Git'],
      url: '',
    },
  ],
  certifications: [
    { id: 'cert-1', name: 'Professional Data Engineer', issuer: 'Google Cloud', date: 'jun 2023' },
  ],
  publications: [],
  volunteerWork: [
    {
      id: 'vol-1',
      organization: 'Datos para Todas',
      role: 'Mentora',
      startDate: 'sep 2022',
      endDate: 'Actualidad',
      description: 'Acompaño a personas en su primera transición al sector de datos.',
    },
  ],
  awards: [
    { id: 'award-1', title: 'Premio a la mejora interna', issuer: 'Mercado Central', date: '2023' },
  ],
  interests: ['Cerámica', 'Senderismo', 'Novela negra', 'Cocina de mercado'],
};
