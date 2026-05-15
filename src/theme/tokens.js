// ViewxRent — Design tokens (Variation B "Dusk Edit")
// Import where you need raw values (inline styles, gradients, scripted shadows).
// For class usage, use the vxr-* utilities defined in src/index.css.

export const VXR = {
  // Surfaces
  bg:       '#F7F5F3',
  surface:  '#FFFFFF',
  surface2: '#F2F0EE',
  surface3: '#E8E4DF',
  border:   '#EBEBEB',
  borderStrong: '#D8D2CC',

  // Text
  text:      '#1A1310',
  textSub:   '#7A6E68',
  textMuted: '#B0A8A2',

  // Accents
  accent:     '#FF7043',
  accentDeep: '#E55A2E',
  accentSoft: '#FDEAE4',
  accent2:    '#FF8A80',
  accent3:    '#FF5252',

  // Semantic
  success:     '#22C55E',
  successSoft: '#DCFCE7',
  warning:     '#F59E0B',
  warningSoft: '#FEF3C7',
  danger:      '#EF4444',
  dangerSoft:  '#FEE2E2',
  info:        '#3B82F6',
  infoSoft:    '#DBEAFE',

  // Gradients
  gradient:     'linear-gradient(135deg, #FF7043 0%, #FF5252 50%, #FF8A80 100%)',
  gradientSoft: 'linear-gradient(135deg, #FDEAE4 0%, #FFE4DC 100%)',
  gradientText: 'linear-gradient(135deg, #FF7043 0%, #FF5252 100%)',

  // Type families
  fontHead: "'Plus Jakarta Sans', sans-serif",
  fontBody: "'DM Sans', sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  // Radius
  r: { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, pill: 999, sheet: 28 },

  // Shadow
  shadow: {
    sm:  '0 1px 3px rgba(26,19,16,0.06), 0 1px 2px rgba(26,19,16,0.04)',
    md:  '0 4px 12px rgba(26,19,16,0.08), 0 2px 4px rgba(26,19,16,0.05)',
    lg:  '0 12px 32px rgba(26,19,16,0.10), 0 4px 8px rgba(26,19,16,0.05)',
    cta: '0 8px 24px -4px rgba(255,112,67,0.35), 0 4px 8px -2px rgba(255,112,67,0.18)',
  },
};

export default VXR;
