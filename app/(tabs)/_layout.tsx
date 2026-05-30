import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, useThemeUpdate } from '../../constants/theme';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 32; // Sát lề hơn, nhìn hiện đại và thoáng hơn
const TAB_COUNT = 7;
const TAB_WIDTH = (TAB_BAR_WIDTH - 10) / TAB_COUNT;

function FloatingTabBar({ state, descriptors, navigation }: any) {
  useThemeUpdate();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH,
      tension: 70, // Đàn hồi chuẩn Apple
      friction: 9,  // Độ mượt cao
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBarShadowContainer, SHADOWS.glowDark]}>
        <BlurView intensity={35} tint="dark" style={styles.blurBackground}>
          <View style={styles.tabBarElement}>
            {/* HIỆU ỨNG VIÊN THUỐC TRƯỢT GLOW */}
            <Animated.View
              style={[
                styles.slidingPill,
                { transform: [{ translateX: slideAnim }] }
              ]}
            >
              <LinearGradient
                colors={COLORS.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientPill}
              />
            </Animated.View>

            {/* CÁC NÚT TAB */}
            {state.routes.map((route: any, index: number) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              let iconName = 'ellipse';
              if (route.name === 'index') iconName = isFocused ? 'calendar' : 'calendar-outline';
              if (route.name === 'apps') iconName = isFocused ? 'grid' : 'grid-outline';
              if (route.name === 'search') iconName = isFocused ? 'search' : 'search-outline';
              if (route.name === 'sign') iconName = isFocused ? 'folder-open' : 'folder-outline';
              if (route.name === 'vip') iconName = isFocused ? 'star' : 'star-outline';
              if (route.name === 'account') iconName = isFocused ? 'person' : 'person-outline';
              if (route.name === 'settings') iconName = isFocused ? 'settings' : 'settings-outline';

              return (
                <TouchableOpacity 
                  key={route.name} 
                  accessibilityRole="button" 
                  onPress={onPress} 
                  style={styles.tabItem}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={iconName as any} 
                    size={22} 
                    color={isFocused ? '#FFFFFF' : '#8E8E93'} 
                    style={{ zIndex: 1 }}
                  />
                  {isFocused && <View style={styles.activeDot} />}
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
  return (
    <>
      <StatusBar style="light" />
      <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
        <Tabs.Screen name="apps" options={{ title: 'Ứng dụng' }} />
        <Tabs.Screen name="search" options={{ title: 'Tìm kiếm' }} />
        <Tabs.Screen name="sign" options={{ title: 'Ký app' }} />
        <Tabs.Screen name="vip" options={{ title: 'Kho VIP' }} />
        <Tabs.Screen name="account" options={{ title: 'Cá nhân' }} />
        <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 30, // Đẩy cao hơn mặt đất tí
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  tabBarShadowContainer: {
    width: TAB_BAR_WIDTH,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  blurBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(12, 12, 16, 0.45)', // Giao diện kính tối
  },
  tabBarElement: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 32,
  },
  tabItem: {
    width: TAB_WIDTH,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: 48,
    borderRadius: 24,
    left: 5,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientPill: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  activeDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  }
});