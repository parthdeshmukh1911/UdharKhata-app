// src/styles/typography.js

import { Platform } from 'react-native';
import { scaleFontSize } from '../Utils/Responsive';

export const Typography = {
  // Font Families
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
    }),
  },

  // Font Sizes
  size: {
    h1: scaleFontSize(32),
    h2: scaleFontSize(28),
    h3: scaleFontSize(24),
    h4: scaleFontSize(20),
    h5: scaleFontSize(18),
    h6: scaleFontSize(16),
    body: scaleFontSize(16),
    bodySmall: scaleFontSize(14),
    caption: scaleFontSize(12),
    tiny: scaleFontSize(10),
  },

  // Font Weights
  weight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line Heights (relative to font size)
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Pre-built text styles
export const TextStyles = {
  h1: {
    fontSize: Typography.size.h1,
    fontWeight: Typography.weight.bold,
    lineHeight: Typography.size.h1 * Typography.lineHeight.tight,
  },
  h2: {
    fontSize: Typography.size.h2,
    fontWeight: Typography.weight.bold,
    lineHeight: Typography.size.h2 * Typography.lineHeight.tight,
  },
  h3: {
    fontSize: Typography.size.h3,
    fontWeight: Typography.weight.semibold,
    lineHeight: Typography.size.h3 * Typography.lineHeight.tight,
  },
  body: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.regular,
    lineHeight: Typography.size.body * Typography.lineHeight.normal,
  },
  bodyBold: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    lineHeight: Typography.size.body * Typography.lineHeight.normal,
  },
  caption: {
    fontSize: Typography.size.caption,
    fontWeight: Typography.weight.regular,
    lineHeight: Typography.size.caption * Typography.lineHeight.normal,
  },
};
