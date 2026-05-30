import { Platform } from 'react-native';

let StaticServerClass: any = null;
if (Platform.OS !== 'web') {
  try {
    StaticServerClass = require('@dr.pogodin/react-native-static-server').default || require('@dr.pogodin/react-native-static-server');
  } catch (e) {
    console.warn('[StaticServerManager] Failed to load static server module:', e);
  }
}

let activeServerInstance: any = null;
let activeServerUrl: string | null = null;
let activeFileDir: string | null = null;

export async function startStaticServer(fileDir: string): Promise<string> {
  if (Platform.OS === 'web' || !StaticServerClass) {
    throw new Error('StaticServer is not available on this platform.');
  }

  // If the server is already running for the SAME directory, we can reuse it!
  if (activeServerInstance && activeFileDir === fileDir && activeServerUrl) {
    console.log('[StaticServerManager] Reusing active server instance for:', fileDir);
    return activeServerUrl;
  }

  // Otherwise, stop any running server first
  if (activeServerInstance) {
    try {
      console.log('[StaticServerManager] Stopping existing server instance...');
      await activeServerInstance.stop();
    } catch (e) {
      console.error('[StaticServerManager] Error stopping existing server:', e);
    } finally {
      activeServerInstance = null;
      activeServerUrl = null;
      activeFileDir = null;
    }
  }

  console.log('[StaticServerManager] Starting new server for:', fileDir);
  
  // Use port 0 to let the OS dynamically assign an ephemeral port
  const server = new StaticServerClass({
    port: 0,
    fileDir: fileDir,
    hostname: '127.0.0.1'
  });

  try {
    const url = await server.start();
    activeServerInstance = server;
    activeServerUrl = url;
    activeFileDir = fileDir;
    console.log('[StaticServerManager] Server started at:', url);
    return url;
  } catch (error) {
    activeServerInstance = null;
    activeServerUrl = null;
    activeFileDir = null;
    throw error;
  }
}

export async function stopStaticServer(): Promise<void> {
  if (activeServerInstance) {
    try {
      console.log('[StaticServerManager] Stopping active server...');
      await activeServerInstance.stop();
    } catch (e) {
      console.error('[StaticServerManager] Error during stop:', e);
    } finally {
      activeServerInstance = null;
      activeServerUrl = null;
      activeFileDir = null;
    }
  }
}
