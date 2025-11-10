// src/utils/responsive.js

import { Dimensions, Platform, PixelRatio } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro, or your design reference)
const baseWidth = 375;
const baseHeight = 812;

// ✅ GLOBAL SCALE FACTOR - Adjust this to make ENTIRE UI smaller/larger
const SCALE_FACTOR = 0.90; // 🎯 85% of original size (make smaller)
// Try: 0.90 (10% smaller), 0.85 (15% smaller), 0.80 (20% smaller)

/**
 * Scales a value based on screen width with global scale factor
 * @param {number} size - The size to scale
 * @returns {number} - Scaled size
 */
export const scaleWidth = (size) => {
  return (SCREEN_WIDTH / baseWidth) * size * SCALE_FACTOR; // ✅ Apply scale
};

/**
 * Scales a value based on screen height with global scale factor
 * @param {number} size - The size to scale
 * @returns {number} - Scaled size
 */
export const scaleHeight = (size) => {
  return (SCREEN_HEIGHT / baseHeight) * size * SCALE_FACTOR; // ✅ Apply scale
};

/**
 * Moderately scales a font size with global scale factor
 * @param {number} size - Font size to scale
 * @param {number} factor - Scaling factor (default 0.5)
 * @returns {number} - Scaled font size
 */
export const scaleFontSize = (size, factor = 0.5) => {
  const newSize = size + (scaleWidth(size) - size) * factor;
  
  // Round to nearest pixel for crisp text
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * SCALE_FACTOR)); // ✅ Apply scale
  }
  return Math.round(newSize * SCALE_FACTOR); // ✅ Apply scale
};

/**
 * Get responsive font sizes for your app
 */
export const FontSizes = {
  tiny: scaleFontSize(10),
  small: scaleFontSize(12),
  medium: scaleFontSize(14),
  regular: scaleFontSize(16),
  large: scaleFontSize(18),
  xlarge: scaleFontSize(20),
  xxlarge: scaleFontSize(24),
  huge: scaleFontSize(30),
};

/**
 * Get responsive spacing
 */
export const Spacing = {
  xs: scaleWidth(4),
  sm: scaleWidth(8),
  md: scaleWidth(12),
  lg: scaleWidth(16),
  xl: scaleWidth(20),
  xxl: scaleWidth(24),
};

/**
 * Get responsive icon sizes
 */
export const IconSizes = {
  tiny: Math.round(scaleWidth(12)),
  small: Math.round(scaleWidth(16)),
  medium: Math.round(scaleWidth(20)),
  large: Math.round(scaleWidth(24)),
  xlarge: Math.round(scaleWidth(32)),
  xxlarge: Math.round(scaleWidth(40)),
};

/**
 * Get responsive button heights
 */
export const ButtonSizes = {
  small: scaleHeight(36),
  medium: scaleHeight(44),
  large: scaleHeight(52),
  xlarge: scaleHeight(56),
};

/**
 * Get responsive border radius
 */
export const BorderRadius = {
  small: scaleWidth(6),
  medium: scaleWidth(8),
  large: scaleWidth(12),
  xlarge: scaleWidth(16),
  round: scaleWidth(999),
};

/**
 * Check if device is small
 */
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;

/**
 * Check device type
 */
export const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return aspectRatio < 1.6;
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  FontSizes,
  Spacing,
  IconSizes,
  ButtonSizes,
  BorderRadius,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isTablet,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
