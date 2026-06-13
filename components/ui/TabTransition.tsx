import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';

interface TabTransitionProps {
  children: React.ReactNode;
  tabPath: string;
}

// Global variable to track the active tab across tab components
let lastActiveTabPath = '/';

const TAB_PATHS = ['/', '/sign', '/apps', '/mmo'];

export function TabTransition({ children, tabPath }: TabTransitionProps) {
  const pathname = usePathname();
  // Normalize pathname (strip trailing slashes if any)
  const normalizedPathname = pathname === '/index' ? '/' : pathname;
  const isTabActive = normalizedPathname === tabPath;

  const opacity = useRef(new Animated.Value(isTabActive ? 1 : 0.95)).current;
  const translateY = useRef(new Animated.Value(isTabActive ? 0 : 12)).current;
  const scale = useRef(new Animated.Value(isTabActive ? 1 : 0.985)).current;

  useEffect(() => {
    if (isTabActive) {
      const isTabSwitch = lastActiveTabPath !== tabPath;
      lastActiveTabPath = tabPath;

      if (isTabSwitch) {
        // Reset animations to starting values and slide/fade in
        opacity.setValue(0.95);
        translateY.setValue(12);
        scale.setValue(0.985);

        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            stiffness: 160,
            damping: 20,
            mass: 0.9,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            stiffness: 160,
            damping: 20,
            mass: 0.9,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // If returning from a modal, ensure values stay at active state with no flashing
        opacity.setValue(1);
        translateY.setValue(0);
        scale.setValue(1);
      }
    } else {
      // If another tab was activated, hide this tab immediately
      const isOtherTabActive = TAB_PATHS.includes(normalizedPathname);
      if (isOtherTabActive) {
        opacity.setValue(0);
        translateY.setValue(10);
        scale.setValue(0.98);
      }
      // If a modal or stack page is active on top of tabs, do nothing (keep tab fully visible underneath)
    }
  }, [normalizedPathname, isTabActive, tabPath]);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
