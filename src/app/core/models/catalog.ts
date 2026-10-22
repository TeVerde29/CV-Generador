import type {
  CVData,
  LayoutOption,
  PaletteOption,
  TemplateOption,
} from './cv-data';

/* ── Templates ─────────────────────────────────────────────────────────── */

export const TEMPLATES: TemplateOption[] = [
  { id: 'folha', name: 'Folha', family: 'Esencial', voice: 'sans', description: 'Sóbrio, aireado, sin adornos. El más neutro.' },
  { id: 'linha', name: 'Linha', family: 'Esencial', voice: 'sans', description: 'Reglas finas y jerarquía estricta.' },
  { id: 'manuscrito', name: 'Manuscrito', family: 'Esencial', voice: 'serif', description: 'Serif cálida, ritmo de imprenta.' },
  { id: 'carta', name: 'Carta', family: 'Esencial', voice: 'serif', description: 'Serif con mucho aire, como una carta bien escrita.' },
  { id: 'corporativo', name: 'Corporativo', family: 'Corporativo', voice: 'sans', description: 'Formato clásico de reclutamiento.' },
  { id: 'executivo', name: 'Executivo', family: 'Corporativo', voice: 'serif', description: 'Mayúsculas espaciadas y peso bajo el título.' },
  { id: 'consultoria', name: 'Consultoría', family: 'Corporativo', voice: 'serif', description: 'Bloque denso, orientado a resultados.' },
  { id: 'institucional', name: 'Institucional', family: 'Corporativo', voice: 'sans', description: 'Institución serena: aire, versalitas y una sola tinta.' },
  { id: 'tecnico', name: 'Técnico', family: 'Creativo', voice: 'mono', description: 'Monoespaciada, aire de especificación.' },
  { id: 'revista', name: 'Revista', family: 'Creativo', voice: 'mixed', description: 'Editorial, con acentos de color.' },
  { id: 'compacto', name: 'Compacto', family: 'Creativo', voice: 'sans', description: 'Aprovecha cada línea de la página.' },
  { id: 'cartel', name: 'Cartel', family: 'Creativo', voice: 'sans', description: 'Cartel deolicited: titular grande y aire entre bloques.' },
  { id: 'academico', name: 'Académico', family: 'Académico', voice: 'serif', description: 'Cursivas y estructura de publicación.' },
  { id: 'universidad', name: 'Universidad', family: 'Académico', voice: 'serif', description: 'Estilo de servicio de carreras.' },
  { id: 'tesis', name: 'Tesis', family: 'Académico', voice: 'serif', description: 'Formal, con numeración sobria.' },
  { id: 'congreso', name: 'Congreso', family: 'Académico', voice: 'serif', description: 'Artículo de congreso: interlineado amplio y versalitas.' },
];

export const TEMPLATE_FAMILIES: TemplateOption['family'][] = [
  'Esencial',
  'Corporativo',
  'Creativo',
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
  /* ── Verdes ────────────────────────────────────────────────────────── */
  { id: 'bosque', name: 'Bosque', colors: { primary: '#14532d', secondary: '#15803d', accent: '#22c55e' } },
  { id: 'oliva', name: 'Oliva', colors: { primary: '#3f4a1c', secondary: '#6b7a3a', accent: '#a3b565' } },
  { id: 'salvia', name: 'Salvia', colors: { primary: '#3f5136', secondary: '#6b7f5e', accent: '#a9bd94' } },
  { id: 'te-verde', name: 'Té verde', colors: { primary: '#294635', secondary: '#4f7256', accent: '#829b78' } },
  { id: 'matcha', name: 'Matcha', colors: { primary: '#294635', secondary: '#829b78', accent: '#afc49a' } },
  { id: 'eucalipto', name: 'Eucalipto', colors: { primary: '#2f4f43', secondary: '#5b8a72', accent: '#9cc4ae' } },
  { id: 'menta', name: 'Menta', colors: { primary: '#1f4d3d', secondary: '#3f7a5e', accent: '#7fb89a' } },
  { id: 'pistacho', name: 'Pistacho', colors: { primary: '#4a5a23', secondary: '#7c8f3d', accent: '#b3c47a' } },

  /* ── Azules y teal ─────────────────────────────────────────────────── */
  { id: 'océano', name: 'Océano', colors: { primary: '#0c4a6e', secondary: '#0e7490', accent: '#06b6d4' } },
  { id: 'turquesa', name: 'Turquesa', colors: { primary: '#10505a', secondary: '#2b8492', accent: '#7cc3cd' } },
  { id: 'cielo', name: 'Cielo', colors: { primary: '#0077BE', secondary: '#4DA6FF', accent: '#7FD1FF' } },

  /* ── Azul oscuro ───────────────────────────────────────────────────── */
  { id: 'noche', name: 'Noche', colors: { primary: '#0F172A', secondary: '#334155', accent: '#64748B' } },

  /* ── Morados ───────────────────────────────────────────────────────── */
  { id: 'índigo', name: 'Índigo', colors: { primary: '#312e81', secondary: '#4f46e5', accent: '#a5b4fc' } },
  { id: 'orquídea', name: 'Orquídea', colors: { primary: '#8E24AA', secondary: '#AB47BC', accent: '#E1BEE7' } },
  { id: 'ciruela', name: 'Ciruela', colors: { primary: '#4a1d5f', secondary: '#7e22ce', accent: '#c4b5fd' } },
  { id: 'vino', name: 'Vino', colors: { primary: '#5b1720', secondary: '#9f1239', accent: '#fb7185' } },

  /* ── Tierra y rojos ────────────────────────────────────────────────── */
  { id: 'terracota', name: 'Terracota', colors: { primary: '#7c2d12', secondary: '#c2410c', accent: '#fb923c' } },
  { id: 'cobre', name: 'Cobre', colors: { primary: '#8B4513', secondary: '#CD853F', accent: '#DEB887' } },
  { id: 'mostaza', name: 'Mostaza', colors: { primary: '#713f12', secondary: '#b45309', accent: '#fbbf24' } },
  { id: 'oro', name: 'Oro', colors: { primary: '#D4AF37', secondary: '#F0C040', accent: '#F9E077' } },

  /* ── Gris y neutros ────────────────────────────────────────────────── */
  { id: 'tinta', name: 'Tinta', colors: { primary: '#18181b', secondary: '#71717a', accent: '#3f3f46' } },
  { id: 'pizarra', name: 'Pizarra', colors: { primary: '#1f2937', secondary: '#6b7280', accent: '#0ea5e9' } },
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
    references: [],
    customSections: [],
  };
}

export const SAMPLE_CV_DATA: CVData = {
  personalInfo: {
    name: 'Pedro Giovanni Ricra Figueroa',
    title: 'Estudiante de Ingeniería de Sistemas | Desarrollo de Software',
    email: 'pedro.ricra.figueroa@gmail.com',
    phone: '+51 922 149 396',
    location: 'Pucallpa, Perú',
    website: '',
    linkedin: 'linkedin.com/in/pedro-giovanni-ricra-figueroa-971a20433',
    github: 'github.com/TeVerde29',
    portfolio: 'https://portafolio-pedro-ricra.vercel.app/',
  },
  summary: 'Estudiante de Ingeniería de Sistemas (VIII ciclo relativo) en la Universidad Nacional de Ucayali, con experiencia práctica en desarrollo de software y testing. He participado en el desarrollo y mejora de interfaces web, integración frontend y backend, diseño de bases de datos y automatización de pruebas. Experiencia trabajando con HTML, CSS, JavaScript, Angular, Node.js, MySQL, trabajando en equipo y 5 sistemas publicados.',
  experience: [
    {
      id: 'exp-1',
      position: 'Practicante — Oficina de Tecnología de la Información (OTI)',
      company: 'Universidad Nacional de Ucayali — Pucallpa, Perú',
      startDate: '04/2025',
      endDate: '07/2025',
      description: 'Apoyé en el desarrollo del sistema de Posgrado mediante la implementación y mejora de interfaces, incorporando validaciones de datos e integridad de campos y realizando la conexión de las interfaces con el backend.',
      achievements: [
        'Analicé el reglamento de Posgrado para identificar y traducir reglas del proceso en requerimientos funcionales y apoyar en el diseño del modelo de base de datos',
        'Diseñé una metodología de pruebas funcionales en 5 etapas para la plataforma AURA, estableciendo un proceso formal de testing previo al despliegue, inexistente anteriormente',
        'Automaticé pruebas funcionales con Selenium IDE y validaciones backend con Python y Google Colab en 25 funcionalidades de 8 módulos, detectando y documentando 12 fallos con evidencias para el equipo de desarrollo',
        'Reejecuté los casos fallidos después de las correcciones para validar su solución',
        'Herramientas: Selenium IDE, Python, Jupyter Notebook, Google Colab, Git y GitHub',
      ],
    },
    {
      id: 'exp-2',
      position: 'Desarrollador de Software Independiente',
      company: 'Proyectos propios',
      startDate: '2025',
      endDate: 'Actualidad',
      description: 'Desarrollo y publicación de sistemas propios, desde el análisis hasta el despliegue.',
      achievements: ['5 sistemas publicados con demo, uno de ellos con instalador para Windows'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Universidad Nacional de Ucayali — Pucallpa, Perú',
      degree: 'Ingeniería de Sistemas',
      field: 'VIII ciclo relativo',
      startDate: '2022',
      endDate: 'Actualidad',
    },
  ],
  skills: [
    {
      id: 'sk-1',
      category: 'Lenguajes de Programación',
      items: ['Java', 'TypeScript', 'JavaScript', 'SQL'],
    },
    {
      id: 'sk-2',
      category: 'Desarrollo Frontend & Diseño UI',
      items: ['Angular', 'HTML', 'CSS', 'Figma', 'Balsamiq Wireframes'],
    },
    {
      id: 'sk-3',
      category: 'Desarrollo Backend & APIs',
      items: ['Node.js', 'Spring Boot', 'Postman', 'Swagger UI', 'Arquitectura REST'],
    },
    { id: 'sk-4', category: 'Bases de Datos', items: ['MySQL', 'SQL Server'] },
    {
      id: 'sk-5',
      category: 'Testing & Automatización',
      items: ['Selenium IDE', 'Pruebas funcionales'],
    },
    {
      id: 'sk-6',
      category: 'DevOps, Despliegue & Herramientas',
      items: ['Docker', 'Git', 'GitHub'],
    },
    {
      id: 'sk-7',
      category: 'Competencias Profesionales',
      items: [
        'Comunicación técnica',
        'Trabajo en equipo',
        'Pensamiento analítico',
        'Orientación a la calidad',
        'Proactividad',
        'Aprendizaje continuo',
      ],
    },
  ],
  languages: [
    { id: 'lang-1', language: 'Español', proficiency: 'native' },
    { id: 'lang-2', language: 'Inglés', proficiency: 'intermediate' },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Sistema de Reporte de Incidencias',
      description: 'Aplicación web full stack para reportar y gestionar incidencias de infraestructura del campus de la UNU (Universidad Nacional de Ucayali).',
      technologies: ['Angular', 'Node.js', 'MySQL'],
      demoUrl: 'https://reportes-unu.vercel.app/',
      repoUrl: 'https://github.com/TeVerde29/Reportes_UNU',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'Introducción a las Bases de Datos Relacionales (con MySQL)',
      issuer: 'TodoCode',
      date: '10/2026',
    },
  ],
  publications: [
    {
      id: 'pub-1',
      title: 'Metodología de pruebas funcionales en 5 etapas para la plataforma AURA',
      publisher: 'Repositorio institucional UNU',
      date: '2025',
      url: '',
      description: 'Nota técnica con el proceso de pruebas diseñado durante mis prácticas: alcance, casos, evidencias y reejecución de fallos antes del despliegue.',
    },
  ],
  volunteerWork: [
    {
      id: 'vol-1',
      role: 'Mentor de programación',
      organization: 'Club de Programación Competitiva — Universidad Nacional de Ucayali',
      startDate: '2025',
      endDate: 'Actualidad',
      description: 'Acompaño a estudiantes de primeros ciclos en estructuras de datos y resolución de problemas, preparando a los equipos que representan a la universidad en concursos nacionales.',
    },
  ],
  awards: [
    {
      id: 'award-1',
      title: '1.er Puesto — Concurso de Programación Competitiva',
      issuer: 'CONEIMERA — UNTELS (Universidad Nacional Tecnológica de Lima Sur)',
      date: '09/2024',
      description: 'Resolución de problemas algorítmicos complejos y optimización de código bajo presión, en equipo de 3 integrantes.',
    },
  ],
  interests: [
    'Programación competitiva',
    'Optimización logística',
    'Mapas y datos geográficos',
    'Automatización de pruebas',
    'Videojuegos indie',
  ],
  references: [
    {
      id: 'ref-1',
      name: 'Paolo Blancas',
      title: 'Desarrollador Freelance',
      email: 'blancaspaolo101997@gmail.com',
      phone: '',
    },
  ],
  customSections: [
    {
      id: 'custom-1',
      title: 'Eventos',
      startDate: '2024',
      endDate: '2025',
      link: '',
      description: 'CONEIMERA — Congreso Nacional de Estudiantes de Ing. Mecánica-Eléctrica y Ramas Afines.',
      items: [
        'CONEIMERA 2025, Universidad Nacional de Trujillo — 08/2025',
        'CONEIMERA 2024, Universidad Nacional Tecnológica de Lima Sur — 09/2024',
      ],
    },
  ],
};
