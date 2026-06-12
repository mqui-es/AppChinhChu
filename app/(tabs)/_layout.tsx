import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Dimensions, Text,
  Platform, DeviceEventEmitter, Animated,
} from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GlassView } from '../../components/ui/GlassView';
import * as Haptics from 'expo-haptics';
import { COLORS, useThemeUpdate, TXT } from '../../constants/theme';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { SPRINGS, pulseAnim } from '../../constants/animations';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40;
const TAB_COUNT = 4;
const TAB_WIDTH = (TAB_BAR_WIDTH - 16) / TAB_COUNT;

const TAB_CONFIG = [
  { name: 'index', icon: 'house',           iconActive: 'house.fill' },
  { name: 'sign',  icon: 'wrench',          iconActive: 'wrench.fill' },
  { name: 'apps',  icon: 'square.grid.2x2', iconActive: 'square.grid.2x2.fill' },
  { name: 'mmo',   icon: 'cart',            iconActive: 'cart.fill' },
] as const;

// ─── Single Tab Icon with independent micro-animations ───────────────────────
function TabIcon({ name, isFocused }: { name: string; isFocused: boolean }) {
  const isLight = COLORS.background === '#F4F4F6';
  const config  = TAB_CONFIG.find(c => c.name === name);
  const symbol  = config ? (isFocused ? config.iconActive : config.icon) : 'house';

  const labelMap: Record<string, string> = {
    'index': TXT.langName === 'English' ? 'Home'      : 'Trang chủ',
    'sign':  TXT.langName === 'English' ? 'Creator'   : 'Ký App',
    'apps':  TXT.langName === 'English' ? 'Explore'   : 'Kho App',
    'mmo':   TXT.langName === 'English' ? 'Templates' : 'Chợ MMO',
  };
  const tabLabel = labelMap[name] || name;

  // Icon scale: bounce when becoming focused
  const iconScale   = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;
  const pillScale   = useRef(new Animated.Value(isFocused ? 1 : 0.8)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.55)).current;

  const prevFocused = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !prevFocused.current) {
      // Newly focused: pulse icon + expand pill
      pulseAnim(iconScale, 1.22).start();
      Animated.parallel([
        Animated.spring(pillScale,   { toValue: 1,    ...SPRINGS.bounce }),
        Animated.timing(pillOpacity, { toValue: 1,    duration: 180, useNativeDriver: true }),
        Animated.timing(labelOpacity,{ toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1,    duration: 180, useNativeDriver: true }),
      ]).start();
    } else if (!isFocused && prevFocused.current) {
      Animated.parallel([
        Animated.spring(pillScale,   { toValue: 0.75, ...SPRINGS.snappy }),
        Animated.timing(pillOpacity, { toValue: 0,    duration: 150, useNativeDriver: true }),
        Animated.timing(labelOpacity,{ toValue: 0.55, duration: 160, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 0.5,  duration: 180, useNativeDriver: true }),
      ]).start();
    }
    prevFocused.current = isFocused;
  }, [isFocused]);

  const activeColor   = isLight ? '#000000' : '#FFFFFF';
  const inactiveColor = isLight ? '#8E8E93' : 'rgba(255,255,255,0.45)';
  const pillBg        = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.12)';

  return (
    <View style={styles.iconWrapper}>
      <Animated.View style={[
        styles.iconPill,
        { backgroundColor: pillBg, transform: [{ scale: pillScale }], opacity: pillOpacity },
      ]} />
      <Animated.View style={{ transform: [{ scale: iconScale }], opacity: iconOpacity }}>
        <IconSymbol name={symbol} size={21} color={isFocused ? activeColor : inactiveColor} />
      </Animated.View>
      <Animated.Text style={[
        styles.tabLabel,
        { color: isFocused ? activeColor : inactiveColor,
          fontWeight: isFocused ? '700' : '500',
          opacity: labelOpacity },
      ]}>
        {tabLabel}
      </Animated.Text>
    </View>
  );
}

// ─── Floating Tab Bar ─────────────────────────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: any) {
  useThemeUpdate();
  const isLight = COLORS.background === '#F4F4F6';

  // Vertical translation (hide/show)
  const translateY = useRef(new Animated.Value(0)).current;
  // Overall bar scale: slight "breath" on show
  const barScale   = useRef(new Animated.Value(1)).current;
  // Bar opacity for very smooth transitions
  const barOpacity = useRef(new Animated.Value(1)).current;

  const showBar = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0,   ...SPRINGS.float }),
      Animated.spring(barScale,   { toValue: 1,   ...SPRINGS.bounce }),
      Animated.timing(barOpacity, { toValue: 1,   duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const hideBar = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 130, ...SPRINGS.float }),
      Animated.spring(barScale,   { toValue: 0.9, ...SPRINGS.snappy }),
      Animated.timing(barOpacity, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const showSub = DeviceEventEmitter.addListener('showTabBar', showBar);
    const hideSub = DeviceEventEmitter.addListener('hideTabBar', hideBar);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [showBar, hideBar]);

  // Always re-show when active tab changes
  useEffect(() => { showBar(); }, [state.index]);

  const visibleRoutes = state.routes.filter((route: any) =>
    TAB_CONFIG.some(c => c.name === route.name)
  );

  return (
    <Animated.View style={[
      styles.tabBarContainer,
      { transform: [{ translateY }, { scale: barScale }], opacity: barOpacity },
    ]}>
      {/* Liquid Glass pill */}
      <View style={[
        styles.tabBarOuter,
        isLight ? styles.tabBarOuterLight : styles.tabBarOuterDark,
      ]}>
        <GlassView
          intensity={isLight ? 85 : 55}
          tint={isLight ? 'light' : 'dark'}
          style={styles.blurFill}
        >
          {/* Inner highlight stripe — mimics Apple's Liquid Glass top glint */}
          <View style={[
            styles.glassHighlight,
            { backgroundColor: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.07)' },
          ]} />

          <View style={styles.tabRow}>
            {visibleRoutes.map((route: any) => {
              const isFocused = state.routes[state.index].name === route.name;

              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.name}
                  accessibilityRole="button"
                  onPress={onPress}
                  style={[styles.tabItem, { width: TAB_WIDTH }]}
                  activeOpacity={1}
                >
                  <TabIcon name={route.name} isFocused={isFocused} />
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassView>
      </View>
    </Animated.View>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  useThemeUpdate();
  const isLight = COLORS.background === '#F4F4F6';

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index"   options={{ title: 'Trang chủ' }} />
        <Tabs.Screen name="sign"    options={{ title: 'Ký App' }} />
        <Tabs.Screen name="apps"    options={{ title: 'Kho App' }} />
        <Tabs.Screen name="mmo"     options={{ title: 'Chợ MMO' }} />
      </Tabs>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 22,
    width: '100%',
    alignItems: 'center',
    zIndex: 999,
  },
  tabBarOuter: {
    width: TAB_BAR_WIDTH,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
  },
  tabBarOuterDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 24,
    borderWidth: 0.7,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(18,18,22,0.88)',
  },
  tabBarOuterLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 0.7,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  blurFill: {
    flex: 1,
    position: 'relative',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1.5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 2,
  },
  tabRow: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  iconPill: {
    position: 'absolute',
    width: 52,
    height: 30,
    borderRadius: 15,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});