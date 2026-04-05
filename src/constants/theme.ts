export const palette = {
  shell: '#f7f0e8',
  pageGlow: ['#f6f1ea', '#efe3d1', '#f8f4ef'] as const,
  card: 'rgba(255, 252, 248, 0.82)',
  cardBorder: 'rgba(120, 53, 15, 0.08)',
  text: '#1c1917',
  secondaryText: '#57534e',
  muted: '#78716c',
  accent: '#b45309',
  accentContrast: '#fff7ed',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -1.2,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700' as const,
  },
};

export const shadows = {
  soft: {
    shadowColor: '#431407',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 4,
  },
  large: {
    shadowColor: '#431407',
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    elevation: 8,
  },
};

