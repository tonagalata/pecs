// Design tokens shared by every screen. Colors match the approved design canvas.

export type Group = 'pron' | 'verb' | 'desc' | 'noun' | 'q' | 'social' | 'urgent' | 'misc';

/** Modified Fitzgerald key: [tile fill, tile edge]. Edges also differ in lightness, not only hue. */
export const GROUP_COLORS: Record<Group, { fill: string; edge: string; label: string }> = {
  pron: { fill: '#FBEFC2', edge: '#A9811C', label: 'People' },
  verb: { fill: '#DCEFD6', edge: '#3F7D3A', label: 'Actions' },
  desc: { fill: '#DCE8F6', edge: '#2F619A', label: 'Describe' },
  noun: { fill: '#F9E1CF', edge: '#A85A22', label: 'Things' },
  q: { fill: '#E9E0F3', edge: '#6A4C93', label: 'Questions' },
  social: { fill: '#F6DDE8', edge: '#9C3F6B', label: 'Social' },
  urgent: { fill: '#F6D8D4', edge: '#A8362C', label: 'Urgent' },
  misc: { fill: '#EEEFEC', edge: '#6B706C', label: 'Other' },
};

export const GROUP_ORDER: Group[] = ['pron', 'verb', 'desc', 'noun', 'q', 'social', 'urgent', 'misc'];

export type ThemeName = 'light' | 'dim' | 'contrast';

export interface Palette {
  ground: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  line: string;
  lineStrong: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  focus: string;
  success: string;
  danger: string;
  /** Background behind pictograms on dark themes so their outlines stay visible. */
  symbolBack: string;
  /** Whether tiles use the Fitzgerald fill (true) or neutral surface with colored edge (false). */
  tintedTiles: boolean;
}

export const PALETTES: Record<ThemeName, Palette> = {
  light: {
    ground: '#F2F5F4', surface: '#FFFFFF', surfaceAlt: '#EEF2F1', ink: '#17302E', inkSoft: '#485A57',
    line: '#D8E0DD', lineStrong: '#C9D5D1', accent: '#1E5C73', onAccent: '#FFFFFF', accentSoft: '#DCEAEE',
    focus: '#E3A43A', success: '#3F7D3A', danger: '#A8362C', symbolBack: 'transparent', tintedTiles: true,
  },
  dim: {
    ground: '#141C1B', surface: '#1F2A29', surfaceAlt: '#263332', ink: '#E8EFED', inkSoft: '#A9BAB6',
    line: '#33423F', lineStrong: '#4A5B58', accent: '#8CC3D3', onAccent: '#0F1A19', accentSoft: '#22424B',
    focus: '#E3A43A', success: '#7FC07A', danger: '#E58A80', symbolBack: '#E8EFED', tintedTiles: false,
  },
  contrast: {
    ground: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#F0F0F0', ink: '#000000', inkSoft: '#222222',
    line: '#000000', lineStrong: '#000000', accent: '#003A52', onAccent: '#FFFFFF', accentSoft: '#D6E8EF',
    focus: '#C76A00', success: '#1D5A19', danger: '#8A1C12', symbolBack: 'transparent', tintedTiles: true,
  },
};

export const FONTS = {
  body: 'AtkinsonHyperlegible_400Regular',
  bodyBold: 'AtkinsonHyperlegible_700Bold',
  display: 'Lexend_600SemiBold',
  displayMedium: 'Lexend_500Medium',
};

export const TEXT_SCALE = { M: 0.9, L: 1, XL: 1.18 } as const;

export const RADIUS = { tile: 18, card: 20, pill: 999, control: 14 };
