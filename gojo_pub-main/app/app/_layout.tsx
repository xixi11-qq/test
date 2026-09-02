import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { C, loadAppConfig, SERVER_URL, FIXED_USER_ID } from '../constants/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function pushDebug(step: string) {
  try {
    await axios.post(`${SERVER_URL}/push/debug`, { user_id: FIXED_USER_ID, step });
  } catch {}
}

async function registerForPush() {
  await pushDebug('开始注册');
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '主动消息',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') {
      await pushDebug('没给权限');
      return;
    }
    const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await axios.post(`${SERVER_URL}/push/register`, {
      user_id: FIXED_USER_ID,
      token: tokenResp.data,
    });
    await pushDebug('注册成功');
  } catch (e: any) {
    await pushDebug('出错:' + (e?.message || String(e)).slice(0, 200));
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // ★ 先把 SERVER_URL / FIXED_USER_ID 读出来，再渲染页面
  //   否则首屏请求会用默认值，用户改了地址也不生效
  useEffect(() => {
    (async () => {
      await loadAppConfig();
      setReady(true);
    })();
  }, []);

  // ★ 配置读好之后，向后端注册 push token（角色主动发消息靠这个）
  useEffect(() => {
    if (ready) registerForPush();
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="diary" />
          <Stack.Screen name="character" />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
