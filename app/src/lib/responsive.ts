import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base dimensions (design was made for these dimensions)
const BASE_WIDTH = 375; // iPhone X width
const BASE_HEIGHT = 812; // iPhone X height

/**
 * Scale a value based on screen width
 * Use for horizontal measurements (width, marginHorizontal, paddingHorizontal)
 */
export function scaleWidth(size: number): number {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
}

/**
 * Scale a value based on screen height
 * Use for vertical measurements (height, marginVertical, paddingVertical)
 */
export function scaleHeight(size: number): number {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
}

/**
 * Scale font size - uses a moderate scaling factor to prevent fonts
 * from getting too large on tablets or too small on tiny phones
 */
export function scaleFontSize(size: number): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * Math.min(scale, 1.3); // Cap at 130% to prevent huge fonts on tablets

  if (Platform.OS === "ios") {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2; // Android needs slightly smaller
}

/**
 * Moderate scale - for elements that shouldn't scale as aggressively
 * Good for icons, badges, small UI elements
 */
export function moderateScale(size: number, factor = 0.5): number {
  return size + (scaleWidth(size) - size) * factor;
}

/**
 * Get responsive value based on screen size breakpoints
 */
export function responsiveValue<T>(options: {
  small?: T;
  medium?: T;
  large?: T;
  default: T;
}): T {
  if (SCREEN_WIDTH < 350 && options.small !== undefined) return options.small;
  if (SCREEN_WIDTH < 400 && options.medium !== undefined) return options.medium;
  if (SCREEN_WIDTH >= 400 && options.large !== undefined) return options.large;
  return options.default;
}

/**
 * Check if device is a tablet
 */
export function isTablet(): boolean {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 600 || (aspectRatio < 1.6 && SCREEN_WIDTH >= 500);
}

/**
 * Check if device is a small phone
 */
export function isSmallPhone(): boolean {
  return SCREEN_WIDTH < 350 || SCREEN_HEIGHT < 600;
}

/**
 * Common responsive font sizes
 */
export const fonts = {
  tiny: scaleFontSize(10),
  small: scaleFontSize(12),
  body: scaleFontSize(14),
  medium: scaleFontSize(16),
  large: scaleFontSize(18),
  h3: scaleFontSize(20),
  h2: scaleFontSize(24),
  h1: scaleFontSize(28),
  hero: scaleFontSize(32),
  giant: scaleFontSize(40),
};

/**
 * Common responsive spacing
 */
export const spacing = {
  xs: scaleWidth(4),
  sm: scaleWidth(8),
  md: scaleWidth(12),
  lg: scaleWidth(16),
  xl: scaleWidth(20),
  xxl: scaleWidth(24),
  xxxl: scaleWidth(32),
};

/**
 * Screen dimensions
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallPhone(),
  isTablet: isTablet(),
};

/**
 * Maximum width for content to prevent stretching on tablets
 */
export const MAX_CONTENT_WIDTH = 500;

/**
 * Get content width that's responsive but capped
 */
export function getContentWidth(): number {
  return Math.min(SCREEN_WIDTH - spacing.lg * 2, MAX_CONTENT_WIDTH);
}
