-- Poblar tabla de planes de suscripción
INSERT INTO plans (name, price_monthly, price_annual, features) VALUES
('Free', 0, 0, '[
  "Hasta 5 convocatorias",
  "Búsqueda básica",
  "Notificaciones por email",
  "Exportar a PDF"
]'),
('Pro Monthly', 2990, NULL, '[
  "Convocatorias ilimitadas",
  "Búsqueda avanzada y filtros",
  "Calendario inteligente",
  "Notificaciones push y email",
  "Análisis de IA para parsing",
  "Exportar a Excel/PDF",
  "Sincronización con calendario",
  "Alertas personalizadas",
  "Soporte prioritario"
]'),
('Pro Annual', NULL, 29900, '[
  "Convocatorias ilimitadas",
  "Búsqueda avanzada y filtros",
  "Calendario inteligente",
  "Notificaciones push y email",
  "Análisis de IA para parsing",
  "Exportar a Excel/PDF",
  "Sincronización con calendario",
  "Alertas personalizadas",
  "Soporte prioritario",
  "2 meses gratis"
]');

-- Poblar tabla de convocatorias con datos de ejemplo
INSERT INTO convocatorias (
  title,
  description,
  organization,
  category,
  status,
  funding_amount,
  application_deadline,
  requirements,
  contact_info,
  tags,
  priority,
  created_by
) VALUES
(
  'Subsidio Semilla de Asignación Flexible',
  'Subsidio dirigido a personas naturales o jurídicas para el desarrollo de emprendimientos innovadores con potencial de crecimiento y escalabilidad.',
  'CORFO',
  'emprendimiento',
  'abierta',
  25000000,
  '2025-09-15',
  '[
    "Ser persona natural chilena o extranjera con residencia definitiva",
    "Presentar plan de negocio detallado",
    "Demostrar potencial de innovación",
    "No haber recibido subsidios CORFO en los últimos 2 años"
  ]',
  '{
    "email": "subsidios@corfo.cl",
    "phone": "+56 2 2631 8200",
    "website": "https://www.corfo.cl/sites/cpp/subsidios"
  }',
  '["subsidio", "emprendimiento", "innovación", "semilla"]',
  'alta',
  NULL
),
(
  'Capital Semilla Empresa',
  'Instrumento que busca apoyar emprendimientos dinámicos liderados por equipos de alto potencial, con modelos de negocio escalables.',
  'CORFO',
  'emprendimiento',
  'abierta',
  60000000,
  '2025-10-30',
  '[
    "Empresa constituida hace máximo 4 años",
    "Ventas anuales menores a UF 25.000",
    "Equipo emprendedor con dedicación completa",
    "Modelo de negocio escalable e innovador"
  ]',
  '{
    "email": "capitalsemilla@corfo.cl",
    "phone": "+56 2 2631 8200",
    "website": "https://www.corfo.cl/sites/cpp/capital-semilla"
  }',
  '["capital", "empresa", "escalabilidad", "alto-potencial"]',
  'alta',
  NULL
),
(
  'Subsidio FOSIS Emprende',
  'Programa dirigido a personas en situación de vulnerabilidad social para desarrollar emprendimientos que mejoren sus ingresos familiares.',
  'FOSIS',
  'inclusion-social',
  'abierta',
  1200000,
  '2025-08-30',
  '[
    "Pertenecer al 60% más vulnerable según Registro Social de Hogares",
    "Ser mayor de 18 años",
    "Tener idea de emprendimiento viable",
    "Participar en talleres de capacitación"
  ]',
  '{
    "email": "emprende@fosis.gob.cl",
    "phone": "+56 2 2596 6000",
    "website": "https://www.fosis.gob.cl/programas/emprende"
  }',
  '["fosis", "vulnerabilidad", "inclusion", "microemprendimiento"]',
  'media',
  NULL
),
(
  'Programa Impulso Chileno',
  'Apoyo integral para el fortalecimiento y crecimiento de micro y pequeñas empresas chilenas mediante capacitación y financiamiento.',
  'SERCOTEC',
  'mipyme',
  'proximamente',
  8000000,
  '2025-11-15',
  '[
    "Micro o pequeña empresa legalmente constituida",
    "Ventas anuales entre UF 200 y UF 25.000",
    "Al menos 1 año de funcionamiento",
    "Compromiso de participación en programa de fortalecimiento"
  ]',
  '{
    "email": "impulso@sercotec.cl",
    "phone": "+56 2 2473 3800",
    "website": "https://www.sercotec.cl/programas/impulso-chileno"
  }',
  '["sercotec", "mipyme", "fortalecimiento", "crecimiento"]',
  'media',
  NULL
),
(
  'Concurso Nacional de Innovación',
  'Concurso para proyectos de investigación aplicada y desarrollo tecnológico con potencial de transferencia al sector productivo.',
  'ANID',
  'investigacion',
  'cerrada',
  150000000,
  '2025-07-31',
  '[
    "Investigador responsable con grado de Doctor",
    "Institución patrocinante acreditada",
    "Proyecto con componente de innovación tecnológica",
    "Carta de compromiso de empresa adoptante"
  ]',
  '{
    "email": "innovacion@anid.cl",
    "phone": "+56 2 2365 4400",
    "website": "https://www.anid.cl/concursos/concurso-nacional-innovacion"
  }',
  '["anid", "investigacion", "innovacion", "tecnologia"]',
  'baja',
  NULL
),
(
  'Fondo de Inversión Estratégica FIE',
  'Instrumento de financiamiento para proyectos de alto impacto que promuevan la competitividad y diversificación productiva.',
  'CORFO',
  'inversion',
  'evaluacion',
  500000000,
  '2025-12-20',
  '[
    "Proyecto con inversión mínima de USD 5 millones",
    "Impacto en competitividad sectorial o territorial",
    "Compromiso de contrapartida privada",
    "Evaluación de impacto económico y social"
  ]',
  '{
    "email": "fie@corfo.cl",
    "phone": "+56 2 2631 8200",
    "website": "https://www.corfo.cl/sites/cpp/fie"
  }',
  '["fie", "inversion", "alto-impacto", "competitividad"]',
  'alta',
  NULL
);

-- Actualizar secuencias si es necesario
SELECT setval('plans_id_seq', (SELECT MAX(id) FROM plans));
SELECT setval('convocatorias_id_seq', (SELECT MAX(id) FROM convocatorias));