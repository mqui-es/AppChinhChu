import React, { forwardRef } from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';
import { GlassView as ExpoGlassView, isLiquidGlassAvailable, GlassStyle, GlassColorScheme } from 'expo-glass-effect';

export interface GlassViewWrapperProps extends ViewProps {
  intensity?: number;
  tint?: BlurViewProps['tint'];
  glassEffectStyle?: GlassStyle;
  tintColor?: string;
  isInteractive?: boolean;
}

export const GlassView = forwardRef<View, GlassViewWrapperProps>(
  ({ intensity = 50, tint = 'default', glassEffectStyle = 'regular', tintColor, isInteractive = false, style, children, ...props }, ref) => {
    
    // Check support for Liquid Glass (iOS 26+ natively supported module)
    const isSupported = Platform.OS === 'ios' && isLiquidGlassAvailable();

    if (isSupported) {
      // Map BlurView tint to GlassView colorScheme
      let colorScheme: GlassColorScheme = 'auto';
      if (tint === 'light' || tint === 'extraLight') {
        colorScheme = 'light';
      } else if (tint === 'dark') {
        colorScheme = 'dark';
      }

      return (
        <ExpoGlassView
          ref={ref}
          glassEffectStyle={glassEffectStyle}
          tintColor={tintColor}
          isInteractive={isInteractive}
          colorScheme={colorScheme}
          style={style}
          {...props}
        >
          {children}
        </ExpoGlassView>
      );
    }

    // Fallback to traditional BlurView
    return (
      <BlurView
        ref={ref as any}
        intensity={intensity}
        tint={tint}
        style={style}
        {...props}
      >
        {children}
      </BlurView>
    );
  }
);

export { isLiquidGlassAvailable };
