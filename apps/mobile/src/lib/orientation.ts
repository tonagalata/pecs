// Tablets always show the board in landscape, where the full grid fits without rotating it.
// Phones keep turning freely. iPad is also restricted to landscape in app.json, so the app
// opens sideways before any JavaScript runs; this lock covers Android tablets too.
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

export function lockTabletLandscape() {
  const { width, height } = Dimensions.get('screen');
  if (Math.min(width, height) < 600) return;
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
}
