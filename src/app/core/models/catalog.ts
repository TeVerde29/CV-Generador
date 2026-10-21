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
  { id: 'corporativo', name: 'Corporativo', family: 'Corporativo', voice: 'sans', description: 'Formato clásico de reclutamiento.' },
  { id: 'executivo', name: 'Executivo', family: 'Corporativo', voice: 'serif', description: 'Mayúsculas espaciadas y peso bajo el título.' },
  { id: 'consultoria', name: 'Consultoría', family: 'Corporativo', voice: 'serif', description: 'Bloque denso, orientado a resultados.' },
  { id: 'tecnico', name: 'Técnico', family: 'Creativo', voice: 'mono', description: 'Monoespaciada, aire de especificación.' },
  { id: 'revista', name: 'Revista', family: 'Creativo', voice: 'mixed', description: 'Editorial, con acentos de color.' },
  { id: 'compacto', name: 'Compacto', family: 'Creativo', voice: 'sans', description: 'Aprovecha cada línea de la página.' },
  { id: 'academico', name: 'Académico', family: 'Académico', voice: 'serif', description: 'Cursivas y estructura de publicación.' },
  { id: 'universidad', name: 'Universidad', family: 'Académico', voice: 'serif', description: 'Estilo de servicio de carreras.' },
  { id: 'tesis', name: 'Tesis', family: 'Académico', voice: 'serif', description: 'Formal, con numeración sobria.' },
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
    references: [],
    customSections: [],
  };
}

export const SAMPLE_CV_DATA: CVData = {
  personalInfo: {
    name: 'Pedro Giovanni Ricra Figueroa',
    title: 'Estudiante de Ingeniería de Sistemas · Desarrollo de Software',
    email: 'pedro.ricra.figueroa@gmail.com',
    phone: '+51 922 149 396',
    location: 'Pucallpa, Perú',
    website: '',
    linkedin: 'linkedin.com/in/pedro-giovanni-ricra-figueroa-971a20433',
    github: 'github.com/TeVerde29',
    portfolio: 'https://teverde29.github.io/Portafolio/',
  },
  summary:
    'Estudiante de Ingeniería de Sistemas (VIII ciclo) en la Universidad Nacional de Ucayali, con experiencia práctica en desarrollo de software y testing. He participado en el desarrollo y mejora de interfaces web, integración frontend y backend, diseño de bases de datos y automatización de pruebas. Experiencia trabajando con HTML, CSS, JavaScript, Angular, Node.js y MySQL, y trabajando en equipo.',
  experience: [
    {
      id: 'exp-1',
      position: 'Practicante — Oficina de Tecnología de la Información (OTI)',
      company: 'Universidad Nacional de Ucayali, Pucallpa',
      startDate: 'abr 2025',
      endDate: 'jul 2025',
      description:
        'Apoyé en el desarrollo del sistema de Posgrado mediante la implementación y mejora de interfaces, incorporando validaciones de datos e integridad de campos y realizando la conexión de las interfaces con el backend.',
      achievements: [
        'Analicé el reglamento de Posgrado para identificar y traducir reglas del proceso en requerimientos funcionales y apoyar en el diseño del modelo de base de datos',
        'Diseñé una metodología de pruebas funcionales en 5 etapas para la plataforma AURA, estableciendo un proceso formal de testing previo al despliegue, inexistente anteriormente',
        'Automaticé pruebas funcionales con Selenium IDE y validaciones backend con Python y Google Colab en 25 funcionalidades de 8 módulos, detectando y documentando 12 fallos con evidencias para el equipo de desarrollo',
        'Reejecuté los casos fallidos después de las correcciones para validar su solución',
        'Realicé el registro biométrico mediante huella y reconocimiento facial del personal de la Facultad de Ciencias de la Salud',
        'Herramientas: Selenium IDE, Python, Jupyter Notebook, Google Colab, Git y GitHub',
      ],
    },
    {
      id: 'exp-2',
      position: 'Desarrollador de software independiente',
      company: 'Proyectos propios, remoto',
      startDate: '2025',
      endDate: 'Actualidad',
      description:
        'Del análisis al despliegue: tres sistemas publicados, uno de ellos con instalador para Windows.',
      achievements: [
        'Publiqué 3 sistemas: gestión de incidencias del campus, optimización de redes logísticas y control de inventario de escritorio',
        'RotaStock Plus alcanzó la versión 2.0.0 con instalador, informes en PDF y Excel y copias de seguridad automáticas',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Universidad Nacional de Ucayali, Pucallpa, Perú',
      degree: 'Ingeniería de Sistemas',
      field: 'X ciclo',
      startDate: '2022',
      endDate: 'Actualidad',
    },
  ],
  skills: [
    {
      id: 'sk-1',
      category: 'Lenguajes de programación',
      items: ['Java', 'TypeScript', 'JavaScript', 'SQL'],
    },
    {
      id: 'sk-2',
      category: 'Desarrollo frontend y UI',
      items: ['Angular', 'HTML5', 'CSS3', 'Figma', 'Balsamiq Wireframes'],
    },
    {
      id: 'sk-3',
      category: 'Backend y APIs',
      items: ['Node.js', 'Spring Boot', 'Postman', 'Swagger UI', 'Arquitectura REST'],
    },
    { id: 'sk-4', category: 'Bases de datos', items: ['MySQL', 'SQL Server'] },
    {
      id: 'sk-5',
      category: 'Testing y automatización',
      items: ['Selenium IDE', 'Pruebas funcionales'],
    },
    {
      id: 'sk-6',
      category: 'DevOps, despliegue y herramientas',
      items: ['Docker', 'Git', 'GitHub'],
    },
    {
      id: 'sk-7',
      category: 'Competencias profesionales',
      items: [
        'Comunicación técnica',
        'trabajo en equipo',
        'pensamiento analítico',
        'orientación a la calidad',
        'proactividad',
        'aprendizaje continuo',
        'documentación técnica',
        'gestión del tiempo bajo presión',
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
      description:
        'Aplicación web full-stack para reportar y gestionar incidencias de infraestructura del campus de la UNU (Universidad Nacional de Ucayali): panel del trabajador con pendientes, aceptados y solucionados, dashboard con KPIs y módulo del estudiante con fotografía, tipo de incidencia y ubicación.',
      technologies: ['Angular', 'Node.js', 'MySQL'],
      demoUrl: 'https://reportes-unu.vercel.app/',
      repoUrl: 'https://github.com/TeVerde29/Reportes_UNU',
    },
    {
      id: 'proj-2',
      name: 'RotaStock Plus — Control de inventario',
      description:
        'Aplicación de escritorio offline para el ciclo completo del almacén: costeo FIFO (PEPS), semaforización de rotación, matriz ABC/XYZ, plan de compras asistido, conteos auditables e informes en PDF y Excel.',
      technologies: ['JavaScript', 'Electron', 'JSON'],
      repoUrl: 'https://github.com/TeVerde29/RotaStock-Plus',
    },
    {
      id: 'proj-3',
      name: 'Asignador Heurístico de Redes Logísticas',
      description:
        'Sistema web que resuelve la asignación almacén–zona sobre mapas reales, con distancias por trazado urbano, KPIs de costo y utilización, y respaldo automático ante fallos del servicio de rutas.',
      technologies: ['JavaScript', 'Leaflet', 'GeoJSON'],
      demoUrl: 'https://teverde29.github.io/Asignador-Heuristico-de-Redes-Logisticas/',
      repoUrl: 'https://github.com/TeVerde29/Asignador-Heuristico-de-Redes-Logisticas',
    },
    {
      id: 'proj-4',
      name: 'Circo Tickets API',
      description:
        'API REST para la gestión de funciones y la reserva de entradas de un circo, con endpoints documentados y probados desde Swagger UI.',
      technologies: ['Java', 'Spring Boot', 'Swagger UI'],
      repoUrl: 'https://github.com/TeVerde29/Circo-Tickets-API',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'Introducción a las Bases de Datos Relacionales (con MySQL)',
      issuer: 'TodoCode',
      date: 'oct 2026',
    },
  ],
  publications: [
    {
      id: 'pub-1',
      title: 'Metodología de pruebas funcionales en 5 etapas para la plataforma AURA',
      publisher: 'Portafolio personal',
      date: '2025',
      url: 'https://teverde29.github.io/Portafolio/',
      description:
        'Nota técnica con el proceso de pruebas que diseñé durante mis prácticas: alcance, casos, evidencias y reejecución de fallos antes del despliegue.',
    },
  ],
  volunteerWork: [
    {
      id: 'vol-1',
      role: 'Mentor de programación',
      organization: 'Club de Programación Competitiva — Universidad Nacional de Ucayali',
      startDate: '2025',
      endDate: 'Actualidad',
      description:
        'Acompaño a estudiantes de primeros ciclos en estructuras de datos y resolución de problemas, preparando a los equipos que representan a la universidad en concursos nacionales.',
    },
  ],
  awards: [
    {
      id: 'award-1',
      title: '1.er puesto — Concurso de Programación Competitiva',
      issuer: 'UNTELS, Lima Sur',
      date: 'oct 2024',
      description:
        'Resolución de problemas algorítmicos complejos y optimización de código bajo presión, en equipo de 3 integrantes.',
    },
  ],
  interests: [
    'Programación competitiva',
    'Optimización logística',
    'Mapas y datos geográficos',
    'Automatización de pruebas',
    'Videojuegos indie',
  ],
  references: [],
  customSections: [],
};
