// Design Templates with complete style configurations

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  layout: 'compact' | 'standard' | 'spacious';
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'default',
    name: 'Standard',
    description: 'Klassisches blaues Design mit ausgewogenen Proportionen',
    preview: '🔵',
    colors: {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      accentColor: '#ec4899',
    },
    borderRadius: 'medium',
    layout: 'standard',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Minimalistisch mit scharfen Kanten und klaren Linien',
    preview: '⬛',
    colors: {
      primaryColor: '#0f172a',
      secondaryColor: '#475569',
      accentColor: '#06b6d4',
    },
    borderRadius: 'small',
    layout: 'standard',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Reduziert auf das Wesentliche mit viel Weißraum',
    preview: '⚪',
    colors: {
      primaryColor: '#6b7280',
      secondaryColor: '#9ca3af',
      accentColor: '#000000',
    },
    borderRadius: 'none',
    layout: 'spacious',
  },
  {
    id: 'colorful',
    name: 'Bunt',
    description: 'Lebendige Farben für energiegeladene Projekte',
    preview: '🌈',
    colors: {
      primaryColor: '#f59e0b',
      secondaryColor: '#ef4444',
      accentColor: '#10b981',
    },
    borderRadius: 'large',
    layout: 'standard',
  },
  {
    id: 'nature',
    name: 'Natur',
    description: 'Erdige Grüntöne für natürliche Harmonie',
    preview: '🌿',
    colors: {
      primaryColor: '#10b981',
      secondaryColor: '#14b8a6',
      accentColor: '#84cc16',
    },
    borderRadius: 'large',
    layout: 'standard',
  },
  {
    id: 'sunset',
    name: 'Sonnenuntergang',
    description: 'Warme Orange- und Rosatöne',
    preview: '🌅',
    colors: {
      primaryColor: '#f97316',
      secondaryColor: '#fb923c',
      accentColor: '#fbbf24',
    },
    borderRadius: 'medium',
    layout: 'standard',
  },
  {
    id: 'ocean',
    name: 'Ozean',
    description: 'Beruhigende Blau- und Türkistöne',
    preview: '🌊',
    colors: {
      primaryColor: '#0891b2',
      secondaryColor: '#06b6d4',
      accentColor: '#22d3ee',
    },
    borderRadius: 'medium',
    layout: 'standard',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professionell mit Dunkelblau und Grau',
    preview: '💼',
    colors: {
      primaryColor: '#1e40af',
      secondaryColor: '#3730a3',
      accentColor: '#6366f1',
    },
    borderRadius: 'small',
    layout: 'compact',
  },
  {
    id: 'midnight',
    name: 'Mitternacht',
    description: 'Dunkles Design mit violetten Akzenten',
    preview: '🌙',
    colors: {
      primaryColor: '#4c1d95',
      secondaryColor: '#7c3aed',
      accentColor: '#a78bfa',
    },
    borderRadius: 'medium',
    layout: 'standard',
  },
];

export const BORDER_RADIUS_OPTIONS = [
  { value: 'none', label: 'Keine (0px)', preview: '⬜' },
  { value: 'small', label: 'Klein (4px)', preview: '▢' },
  { value: 'medium', label: 'Mittel (8px)', preview: '◻' },
  { value: 'large', label: 'Groß (16px)', preview: '⬬' },
];

export const LAYOUT_OPTIONS = [
  { value: 'compact', label: 'Kompakt', description: 'Platzsparend, mehr Inhalt' },
  { value: 'standard', label: 'Standard', description: 'Ausgewogen für alle Zwecke' },
  { value: 'spacious', label: 'Luftig', description: 'Großzügig, viel Weißraum' },
];
