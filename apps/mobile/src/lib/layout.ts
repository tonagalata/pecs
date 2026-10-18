import { useWindowDimensions } from 'react-native';

/** Device class used for mobile- and iPad-first layouts. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const phone = shortSide < 600;
  const portrait = height >= width;
  return {
    width, height, phone, portrait,
    /** Narrow column layouts: phones in portrait. */
    compact: width < 600,
    /** iPad portrait / large phone landscape. */
    medium: width >= 600 && width < 1000,
    wide: width >= 1000,
    pad: phone ? 10 : 16,
  };
}
