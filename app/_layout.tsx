import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initAppThemeAndLang } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    initAppThemeAndLang();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Khối 1: Hiển thị thanh Tab ở dưới cùng */}
        <Stack.Screen name="(tabs)" />
        
        {/* Khối 2: Màn hình Chi tiết (ĐÈ BẸP Tab Bar khi được gọi) */}
        <Stack.Screen 
          name="details/[id]" 
          options={{ 
            presentation: 'card', 
            animation: 'default' 
          }} 
        />
      </Stack>
    </>
  );
}