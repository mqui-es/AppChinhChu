import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';

const { width } = Dimensions.get('window');
const TAB_COUNT = 5;
const TAB_BAR_WIDTH = width - 32;
const TAB_WIDTH = (TAB_BAR_WIDTH - 12) / TAB_COUNT;

const TAB_CONFIG = [
  { name: 'index',    icon: 'house',          iconActive: 'house.fill' },
  { name: 'apps',     icon: 'square.grid.2x2', iconActive: 'square.grid.2x2.fill' },
  { name: 'search',   icon: 'magnifyingglass', iconActive: 'magnifyingglass' },
  { name: 'sign',     icon: 'wrench',          iconActive: 'wrench.fill' },
  { name: 'account',  icon: 'person',          iconActive: 'person.fill' },
];

const IONICON_MAP: Record<string, { default: string; active: string }> = {
  'index':    { default: 'home-outline',     active: 'home' },
  'apps':     { default: 'grid-outline',     active: 'grid' },
  'search':   { default: 'search-outline',   active: 'search' },
  'sign':     { default: 'build-outline',    active: 'build' },
  'account':  { default: 'person-outline',   active: 'person' },
};

function TabIcon({ name, isFocused }: { name: string; isFocused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.15 : 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const icons = IONICON_MAP[name] || { default: 'ellipse-outline', active: 'ellipse' };
  const iconName = isFocused ? icons.active : icons.default;
  
  const labelMap: Record<string, string> = {
    'index': TXT.today,
    'apps': TXT.apps,
    'search': TXT.search,
    'sign': TXT.langName === 'English' ? 'Sign' : 'Ký',
    'account': TXT.profile,
  };
  const tabLabel = labelMap[name] || name;
  const isLight = COLORS.background === '#F2F2F7';

  return (
    <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Ionicons
        name={iconName as any}
        size={isFocused ? 22 : 21}
        color={isFocused ? '#FFFFFF' : (isLight ? '#8E8E93' : 'rgba(255,255,255,0.45)')}
      />
      {isFocused && (
        <Text style={styles.tabLabel}>{tabLabel}</Text>
      )}
    </Animated.View>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  useThemeUpdate();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isLight = COLORS.background === '#F2F2F7';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const pillColors: readonly [string, string] = COLORS.primaryGradient;

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBarOuter, isLight ? styles.tabBarOuterLight : styles.tabBarOuterDark]}>
        <BlurView
          intensity={isLight ? 60 : 40}
          tint={isLight ? 'light' : 'dark'}
          style={styles.blurFill}
        >
          {/* Sliding active pill */}
          <Animated.View
            style={[
              styles.slidingPill,
              { transform: [{ translateX: Animated.add(slideAnim, new Animated.Value(6)) }] }
            ]}
          >
            <LinearGradient
              colors={pillColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillGradient}
            />
          </Animated.View>

          {/* Tab items */}
          <View style={styles.tabRow}>
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              };

              return (
                <TouchableOpacity
                  key={route.name}
                  accessibilityRole="button"
                  onPress={onPress}
                  style={[styles.tabItem, { width: TAB_WIDTH }]}
                  activeOpacity={0.75}
                >
                  <TabIcon name={route.name} isFocused={isFocused} />
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default function TabLayout() {
  useThemeUpdate();
  const isLight = COLORS.background === '#F2F2F7';

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index"    options={{ title: 'Hôm nay' }} />
        <Tabs.Screen name="apps"     options={{ title: 'Kho App' }} />
        <Tabs.Screen name="search"   options={{ title: 'Tìm kiếm' }} />
        <Tabs.Screen name="sign"     options={{ title: 'Ký App' }} />
        <Tabs.Screen name="account"  options={{ title: 'Cá nhân' }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    width: '100%',
    alignItems: 'center',
    zIndex: 999,
  },
  tabBarOuter: {
    width: TAB_BAR_WIDTH,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  tabBarOuterDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  tabBarOuterLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 0.8,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  blurFill: {
    flex: 1,
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 9,
    width: TAB_WIDTH - 4,
    height: 50,
    borderRadius: 25,
    zIndex: 0,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  pillGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  tabRow: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  tabItem: {
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    gap: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
    letterSpacing: 0.2,
  },
});