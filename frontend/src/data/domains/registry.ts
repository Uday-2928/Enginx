/**
 * Central registry of every learning domain on EnginX.
 *
 * The Domains tab, the hub headers and the career maps all read from this one
 * list so branch metadata is never duplicated across components (the icon keys
 * resolve through components/domains/domainIcons.ts).  Each entry carries an
 * honest `status`: the UI shows exactly what is usable today and never dresses
 * a subject catalog up as finished lessons.
 *
 * Adding a branch later = add one entry here (for the catalog + career map)
 * plus an optional content bundle in a sibling data file for full lessons.
 */

export type DomainStatus = 'live' | 'catalog';

export type DomainCategory =
  | 'core-hubs'
  | 'electrical'
  | 'computing'
  | 'civil-mechanical'
  | 'chemical-bio'
  | 'aerospace-auto'
  | 'healthcare'
  | 'sciences'
  | 'professional';

export interface DomainEntry {
  /** Stable slug; also the key into the hub content map. */
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  category: DomainCategory;
  status: DomainStatus;
  /** One honest sentence about what works in this domain today. */
  statusNote: string;
  /** Icon key resolved against the shared icon map in DomainCatalog/DomainHub. */
  icon: string;
  subjects: string[];
  careerRoles: string[];
}

/**
 * Lesson completions for this layer are stored as `domain-` + lesson.id,
 * mirroring the `tutorial-` prefix convention so progress keys from different
 * hubs can never collide inside the shared completion table.
 */
export const DOMAIN_COMPLETION_PREFIX = 'domain-';

export const CATEGORY_LABELS: Record<DomainCategory, string> = {
  'core-hubs': 'Core hubs',
  electrical: 'Electrical & power',
  computing: 'Computing & data',
  'civil-mechanical': 'Civil & mechanical',
  'chemical-bio': 'Chemical, bio & environment',
  'aerospace-auto': 'Aerospace & automotive',
  healthcare: 'Healthcare education',
  sciences: 'Mathematics & sciences',
  professional: 'Professional skills',
};

export const DOMAINS: DomainEntry[] = [
  // -------------------------------------------------------------------------
  // Core hubs - fully built learning workspaces
  // -------------------------------------------------------------------------
  {
    id: 'ece',
    name: 'Electronics & Communication Engineering',
    shortName: 'ECE Hub',
    tagline: 'Electronics, signals, embedded systems, Verilog/VLSI and hardware labs.',
    category: 'core-hubs',
    status: 'live',
    statusNote: 'Full hub today: tutorials, signal lab, virtual hardware lab and coded challenges.',
    icon: 'cpu',
    subjects: [
      'Network Theory', 'Analog Electronics', 'Digital Electronics', 'Signals & Systems',
      'Analog & Digital Communication', 'Electromagnetics', 'Control Systems',
      'Microprocessors & Microcontrollers', 'Embedded C', 'Embedded Systems',
      'Arduino / ESP32 / Raspberry Pi', 'Verilog & VHDL', 'RTL Design & Verification',
      'VLSI & CMOS', 'PCB Design', 'DSP', 'RF & Antennas', 'IoT', 'MATLAB / Octave',
    ],
    careerRoles: ['Embedded Engineer', 'VLSI Design Engineer', 'Verification Engineer', 'PCB Design Engineer', 'RF Engineer', 'DSP Engineer', 'IoT Engineer'],
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity & Ethical Hacking',
    shortName: 'Cyber Hub',
    tagline: 'Defensive security, cryptography, authorized labs and CTF practice.',
    category: 'core-hubs',
    status: 'live',
    statusNote: 'Full hub today: courses, browser-isolated labs and CTF challenges.',
    icon: 'shield',
    subjects: [
      'Linux & Windows Fundamentals', 'Networking / TCP-IP & OSI', 'DNS, DHCP, HTTP/S',
      'CIA Triad & Security Policy', 'Cryptography & PKI', 'Vulnerability Management',
      'Threat Modelling & Risk', 'SIEM & Log Analysis', 'Network Traffic Analysis',
      'Incident Response', 'Digital Forensics', 'Web Application Security',
      'Authentication Security', 'Sandboxed Pentesting Method', 'CTF Practice',
    ],
    careerRoles: ['SOC Analyst', 'Security Analyst', 'Network Security Engineer', 'AppSec Engineer', 'Penetration Tester', 'Cloud Security Engineer', 'Incident Responder', 'Forensics Analyst'],
  },
  {
    id: 'eee',
    name: 'Electrical & Electronics Engineering',
    shortName: 'EEE Hub',
    tagline: 'Circuits, machines, power systems, protection and renewables.',
    category: 'electrical',
    status: 'live',
    statusNote: 'Live lessons with worked calculations, plus career maps; more modules in progress.',
    icon: 'zap',
    subjects: [
      'Circuit Theory & Network Analysis', 'Electrical Machines I & II', 'Transformers',
      'Power Systems I & II', 'Transmission & Distribution', 'Power System Protection',
      'Switchgear & Circuit Breakers', 'Control Systems', 'Power Electronics & Drives',
      'Measurements & Instrumentation', 'Electromagnetic Fields', 'Renewable Energy Systems',
      'PLC & SCADA', 'High Voltage Engineering', 'Electrical Safety & Standards',
    ],
    careerRoles: ['Electrical Design Engineer', 'Power Systems Engineer', 'Protection & Relay Engineer', 'PLC/SCADA Engineer', 'Power Electronics Engineer', 'Renewable Energy Engineer', 'EV Systems Engineer', 'Electrical Maintenance Engineer'],
  },

  // -------------------------------------------------------------------------
  // Computing & data - subject catalogs and career maps today; challenges for
  // these disciplines already run in the shared challenge workspace.
  // -------------------------------------------------------------------------
  {
    id: 'cse',
    name: 'Computer Science & Engineering',
    shortName: 'CSE',
    tagline: 'Programming, DSA, systems, databases, web and software engineering.',
    category: 'computing',
    status: 'catalog',
    statusNote: 'Coding challenges for CSE run today in the Challenges workspace; dedicated lesson paths are in progress.',
    icon: 'code',
    subjects: [
      'C & C++', 'Java', 'Python', 'JavaScript / TypeScript', 'Data Structures & Algorithms',
      'OOP', 'Operating Systems', 'Computer Networks', 'DBMS / SQL & NoSQL',
      'Software Engineering', 'System Design', 'Web / Backend / Full-Stack',
      'Cloud & DevOps', 'CI/CD', 'Testing & Architecture', 'Git', 'Competitive Programming', 'Secure Coding',
    ],
    careerRoles: ['Software Engineer', 'Full-Stack Developer', 'Backend Engineer', 'DevOps Engineer', 'SDET', 'System Designer'],
  },
  {
    id: 'aids',
    name: 'Artificial Intelligence & Data Science (AIDS)',
    shortName: 'AI & DS',
    tagline: 'Statistics, data analysis, pipelines, BI and applied data science.',
    category: 'computing',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches and SQL/statistics problem sets are in progress.',
    icon: 'chart',
    subjects: [
      'Probability & Statistics', 'Linear Algebra', 'Python & Pandas / NumPy',
      'Data Cleaning & EDA', 'Visualization & Dashboards', 'SQL & Relational Databases',
      'ETL & Data Pipelines', 'Data Warehousing', 'Regression & Classification',
      'Time Series & Forecasting', 'A/B Testing & Experimentation', 'Power BI / Tableau', 'Data Storytelling',
    ],
    careerRoles: ['Data Analyst', 'BI Analyst', 'Junior Data Scientist', 'Data Engineer', 'Analytics Engineer', 'Product Analyst'],
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    shortName: 'AI/ML',
    tagline: 'From regression to deep learning, NLP, GenAI and MLOps.',
    category: 'computing',
    status: 'catalog',
    statusNote: 'Coding challenges for the AI/ML discipline run today; lesson paths from foundations to MLOps are in progress.',
    icon: 'brain',
    subjects: [
      'ML Foundations & Regression', 'Trees, Forests & Boosting', 'SVM & kNN',
      'Clustering & Dimensionality Reduction', 'Model Evaluation & Tuning',
      'Neural Networks & Backpropagation', 'CNNs', 'RNN / LSTM & Attention',
      'Transformers & LLMs', 'Transfer Learning & Fine-tuning', 'RAG & Vector Search',
      'Computer Vision', 'NLP', 'Responsible AI', 'MLOps & Deployment',
    ],
    careerRoles: ['ML Engineer', 'Applied AI Engineer', 'CV Engineer', 'NLP Engineer', 'GenAI Engineer', 'MLOps Engineer'],
  },
  {
    id: 'it',
    name: 'Information Technology',
    shortName: 'IT',
    tagline: 'Infrastructure, networking, cloud, identity and IT operations.',
    category: 'computing',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'network',
    subjects: [
      'IT Fundamentals', 'Networking & System Administration', 'Cloud Infrastructure',
      'Database Administration', 'IT Service Management', 'IT Automation',
      'Identity & Access Management', 'Enterprise Systems', 'Infrastructure Monitoring', 'Technical Support',
    ],
    careerRoles: ['Systems Administrator', 'Cloud Engineer', 'Network Engineer', 'IT Support Engineer', 'IAM Analyst'],
  },
  {
    id: 'robotics',
    name: 'Mechatronics & Robotics',
    shortName: 'Robotics',
    tagline: 'Sensors, actuators, control, ROS and autonomous systems.',
    category: 'aerospace-auto',
    status: 'catalog',
    statusNote: 'Robotics & control challenges run today in the Challenges workspace; lesson paths are in progress.',
    icon: 'bot',
    subjects: [
      'Sensors & Actuators', 'Microcontrollers & Motor Control', 'Control Theory',
      'Kinematics & Dynamics', 'Robot Manipulators', 'Mobile Robots', 'Computer Vision',
      'ROS & ROS 2', 'Motion Planning', 'SLAM Fundamentals', 'PLC & Industrial Robotics', 'Robot Safety',
    ],
    careerRoles: ['Robotics Engineer', 'Controls Engineer', 'Automation Engineer', 'ROS Developer'],
  },

  // -------------------------------------------------------------------------
  // Civil & mechanical family
  // -------------------------------------------------------------------------
  {
    id: 'civil',
    name: 'Civil Engineering',
    shortName: 'Civil',
    tagline: 'Structures, construction, geotech, water resources and BIM.',
    category: 'civil-mechanical',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; calculation lesson batches are in progress.',
    icon: 'helmet',
    subjects: [
      'Engineering Mechanics', 'Strength of Materials', 'Structural Analysis',
      'RC & Steel Design', 'Building Materials & Concrete Technology', 'Construction Technology & Management',
      'Surveying & Geomatics', 'Geotechnical & Foundation Engineering', 'Fluid Mechanics & Hydraulics',
      'Hydrology & Irrigation', 'Environmental & Water Supply Engineering',
      'Transportation & Highway Engineering', 'Earthquake Engineering', 'Estimation, Costing & Quantity Surveying', 'BIM',
    ],
    careerRoles: ['Site Engineer', 'Structural Design Engineer', 'Geotechnical Engineer', 'Planning Engineer', 'Quantity Surveyor', 'BIM Engineer', 'Quality Control Engineer'],
  },
  {
    id: 'mechanical',
    name: 'Mechanical Engineering',
    shortName: 'Mechanical',
    tagline: 'Thermo, fluids, design, manufacturing, CAD/FEA and EV systems.',
    category: 'civil-mechanical',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'wrench',
    subjects: [
      'Engineering Mechanics', 'Strength of Materials', 'Thermodynamics', 'Fluid Mechanics',
      'Heat Transfer', 'Manufacturing Processes', 'Machine Design', 'Theory of Machines',
      'Materials Science', 'CAD (SolidWorks / AutoCAD / Creo)', 'FEA & CFD', 'CNC & CAM',
      'GD&T', 'Quality & Maintenance Engineering', 'Additive Manufacturing', 'HVAC', 'EV Systems',
    ],
    careerRoles: ['Design Engineer', 'Manufacturing Engineer', 'CAE / FEA Engineer', 'Quality Engineer', 'HVAC Engineer', 'Product Design Engineer'],
  },
  {
    id: 'industrial',
    name: 'Industrial & Production Engineering',
    shortName: 'Industrial',
    tagline: 'Operations, lean, supply chain and quality systems.',
    category: 'civil-mechanical',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'factory',
    subjects: [
      'Operations Research', 'Production Planning & Control', 'Manufacturing Systems',
      'Supply Chain & Inventory Control', 'Lean Manufacturing', 'Six Sigma',
      'Statistical Process Control', 'Reliability Engineering', 'Scheduling & Optimization', 'ERP Fundamentals',
    ],
    careerRoles: ['Industrial Engineer', 'Quality Engineer', 'Supply Chain Analyst', 'Process Improvement Engineer', 'Production Planner'],
  },

  // -------------------------------------------------------------------------
  // Chemical, bio & environment
  // -------------------------------------------------------------------------
  {
    id: 'chemical',
    name: 'Chemical Engineering',
    shortName: 'Chemical',
    tagline: 'Process calculations, thermodynamics, reactors and separations.',
    category: 'chemical-bio',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'flask',
    subjects: [
      'Material & Energy Balances', 'Process Calculations', 'Chemical Thermodynamics',
      'Fluid Mechanics & Heat Transfer', 'Mass Transfer & Separation Processes',
      'Reaction Engineering', 'Process Control & Design', 'Process Simulation & Safety',
      'Environmental Engineering', 'Process Optimization',
    ],
    careerRoles: ['Process Engineer', 'Design Engineer', 'Process Safety Engineer', 'Production Engineer'],
  },
  {
    id: 'biotech',
    name: 'Biotechnology & Bioengineering',
    shortName: 'Biotech',
    tagline: 'Molecular biology, bioprocesses, bioinformatics and instrumentation.',
    category: 'chemical-bio',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'dna',
    subjects: [
      'Cell & Molecular Biology', 'Genetics', 'Biochemistry', 'Microbiology & Immunology',
      'Genetic Engineering', 'Bioinformatics', 'Bioprocess Engineering', 'Biostatistics',
      'Biomedical Instrumentation', 'Lab Safety & QA',
    ],
    careerRoles: ['Biotech R&D Associate', 'Bioinformatics Analyst', 'Bioprocess Engineer', 'QA/QC Officer'],
  },
  {
    id: 'environmental',
    name: 'Environmental Engineering',
    shortName: 'Environmental',
    tagline: 'Water, air, waste, sustainability and environmental data.',
    category: 'chemical-bio',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'leaf',
    subjects: [
      'Environmental Chemistry & Ecology', 'Water Treatment', 'Wastewater Treatment',
      'Air Pollution & Control', 'Solid Waste Management', 'Environmental Impact Assessment',
      'Environmental Monitoring & GIS', 'Regulations & Climate Science Fundamentals',
    ],
    careerRoles: ['Environmental Engineer', 'Sustainability Analyst', 'EIA Consultant', 'Water Resources Engineer'],
  },
  {
    id: 'agricultural',
    name: 'Agricultural Engineering',
    shortName: 'Agri Engineering',
    tagline: 'Soil-water systems, farm machinery, precision agriculture and IoT.',
    category: 'chemical-bio',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'sprout',
    subjects: [
      'Soil & Water Engineering', 'Irrigation Systems', 'Agricultural Machinery & Farm Power',
      'Post-Harvest & Food Processing', 'Precision Agriculture', 'Remote Sensing & GIS', 'Agri Automation & IoT Sensors',
    ],
    careerRoles: ['Agricultural Engineer', 'Precision Agriculture Analyst', 'Irrigation Engineer', 'Food Process Engineer'],
  },

  // -------------------------------------------------------------------------
  // Aerospace & automotive
  // -------------------------------------------------------------------------
  {
    id: 'aerospace',
    name: 'Aerospace & Aeronautical Engineering',
    shortName: 'Aerospace',
    tagline: 'Aerodynamics, structures, propulsion, avionics and space systems.',
    category: 'aerospace-auto',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'plane',
    subjects: [
      'Aerodynamics', 'Flight Mechanics', 'Aircraft Structures', 'Propulsion',
      'Thermodynamics & Fluid Mechanics', 'Flight Control & Avionics', 'Orbital Mechanics Fundamentals',
      'Aerospace Materials', 'FEA & CFD for Aerospace', 'Aircraft Systems, Safety & Reliability',
    ],
    careerRoles: ['Aerodynamics Engineer', 'Structures Engineer', 'Propulsion Engineer', 'Avionics Engineer', 'Systems Engineer'],
  },
  {
    id: 'automobile',
    name: 'Automobile Engineering',
    shortName: 'Automotive',
    tagline: 'Vehicle systems, diagnostics, EV powertrains and ADAS.',
    category: 'aerospace-auto',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'car',
    subjects: [
      'Vehicle Dynamics', 'Automotive Engines', 'Transmission, Chassis & Suspension',
      'Braking & Safety Systems', 'Automotive Electronics & Sensors', 'EV Powertrains & Battery Management',
      'Charging Systems', 'Vehicle Diagnostics & CAN Bus', 'ADAS Fundamentals', 'Testing & Validation',
    ],
    careerRoles: ['EV Systems Engineer', 'Vehicle Dynamics Engineer', 'Automotive Embedded Engineer', 'Test & Validation Engineer'],
  },

  // -------------------------------------------------------------------------
  // Healthcare education (classroom content only - see hub disclaimers)
  // -------------------------------------------------------------------------
  {
    id: 'medical',
    name: 'Medical & Healthcare Education',
    shortName: 'Medical',
    tagline: 'MBBS, nursing, pharmacy and allied health foundations - study support, not clinical guidance.',
    category: 'healthcare',
    status: 'catalog',
    statusNote: 'Subject catalog and program map ready. Educational content only; lesson batches and case simulations are in expert review.',
    icon: 'stethoscope',
    subjects: [
      'Human Anatomy', 'Human Physiology', 'Biochemistry', 'Pathology & Pharmacology',
      'Microbiology & Immunology', 'Community Medicine & Epidemiology', 'Medical Ethics & Communication',
      'Nursing Fundamentals & Patient Safety', 'Pharmacy: Pharmaceutics, Pharmacology & Pharmacy Calculations',
      'Medical Lab Technology', 'Radiology & Imaging Principles', 'Public Health & Biostatistics',
    ],
    careerRoles: ['Medical Doctor (pathway)', 'Nurse (pathway)', 'Pharmacist (pathway)', 'Medical Lab Technologist', 'Radiographer', 'Public Health Analyst', 'Clinical Research Associate'],
  },

  // -------------------------------------------------------------------------
  // Sciences & cross-cutting
  // -------------------------------------------------------------------------
  {
    id: 'instrumentation',
    name: 'Instrumentation & Control Engineering',
    shortName: 'Instrumentation',
    tagline: 'Sensors, transducers, signal conditioning, PLC/SCADA and DCS.',
    category: 'electrical',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'gauge',
    subjects: [
      'Sensors & Transducers', 'Measurement Systems', 'Signal Conditioning',
      'Analog & Digital Instrumentation', 'Control & Process Control', 'PLC & SCADA',
      'Industrial Networks & DCS', 'Calibration & Reliability',
    ],
    careerRoles: ['Instrumentation Engineer', 'Control Systems Engineer', 'Calibration Engineer', 'Automation Engineer'],
  },
  {
    id: 'mining-energy',
    name: 'Mining, Petroleum & Geological Engineering',
    shortName: 'Mining & Petroleum',
    tagline: 'Mine planning, reservoirs, drilling and applied geology.',
    category: 'sciences',
    status: 'catalog',
    statusNote: 'Subject catalog and career map ready; lesson batches are in progress.',
    icon: 'mountain',
    subjects: [
      'Mine Planning & Rock Mechanics', 'Mine Safety & Ventilation', 'Mineral Processing',
      'Reservoir Engineering', 'Drilling & Production Engineering', 'Well Logging',
      'Structural Geology & Geophysics', 'Hydrogeology', 'Geological Mapping & Remote Sensing',
    ],
    careerRoles: ['Mining Engineer', 'Petroleum Engineer', 'Reservoir Engineer', 'Geological Engineer'],
  },
  {
    id: 'math-sciences',
    name: 'Mathematics, Physics & Statistics',
    shortName: 'Math & Physics',
    tagline: 'The shared language behind every engineering branch.',
    category: 'sciences',
    status: 'catalog',
    statusNote: 'Subject catalog ready; lesson batches are in progress and will be shared across hubs.',
    icon: 'atom',
    subjects: [
      'Calculus', 'Linear Algebra', 'Differential Equations', 'Numerical Methods',
      'Discrete Mathematics', 'Probability & Statistics', 'Optimization',
      'Classical Mechanics', 'Electromagnetism', 'Thermodynamics & Quantum Fundamentals', 'Scientific Computing',
    ],
    careerRoles: ['Data Scientist', 'Research Assistant', 'Quantitative Analyst', 'Computational Scientist'],
  },
  {
    id: 'professional',
    name: 'Professional & Career Skills',
    shortName: 'Career Skills',
    tagline: 'Communication, resumes, interviews and workplace practice for every branch.',
    category: 'professional',
    status: 'catalog',
    statusNote: 'Roadmap ready; interview-prep and resume batches are in progress.',
    icon: 'briefcase',
    subjects: [
      'Technical Writing & Communication', 'Resume & Portfolio Development',
      'Interview Preparation', 'Project Management & Agile', 'Teamwork & Leadership',
      'Financial Literacy', 'Research Writing', 'Workplace Ethics',
    ],
    careerRoles: ['Cross-discipline: every EnginX career path links back here'],
  },
];

export function getDomain(id: string): DomainEntry | undefined {
  return DOMAINS.find((domain) => domain.id === id);
}

export interface DomainSearchResult {
  matchesName: boolean;
  matchesSubject: boolean;
}

/** Case-insensitive search across names, subjects and career roles. */
export function searchDomains(query: string, domainList: DomainEntry[] = DOMAINS): DomainEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return domainList;
  return domainList.filter((domain) => {
    const haystack = [
      domain.name,
      domain.shortName,
      domain.tagline,
      ...domain.subjects,
      ...domain.careerRoles,
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
