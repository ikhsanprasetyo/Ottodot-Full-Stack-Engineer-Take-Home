'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getApi } from '@/lib/utils';
import { getUserFromStorage } from '../hooks/getUserFromStorage';
import { api } from '@/lib/api/api';
import { handleTokenRefresh } from '../api/handleTokenRefresh';
import { isAuthenticated } from '../api/isAuthenticated';

interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<Set<(msg: WebSocketMessage) => void>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  // 1. Token management — hanya sekali saat mount, tidak saat navigasi
  useEffect(() => {
    let isMounted = true;
    const loadToken = async () => {
      setTokenLoading(true);
      try {
        if (!isAuthenticated()) {
          console.log(
            '🔌 WebSocket: Token expired or missing, attempting refresh...'
          );
          await handleTokenRefresh();
        }
        const t = getUserFromStorage()?.accessToken;
        if (isMounted) setToken(t || null);
      } catch (err) {
        console.warn('🔌 WebSocket: Failed to retrieve or refresh token:', err);
        if (isMounted) setToken(null);
      } finally {
        if (isMounted) setTokenLoading(false);
      }
    };

    loadToken();
    return () => {
      isMounted = false;
    };
    // PENTING: tidak ada deps seperti pathname — hanya load sekali saat mount
    // Token akan di-refresh oleh interceptor API jika expired
  }, []);

  // 2. Heartbeat untuk menjaga "Active now" status user
  useEffect(() => {
    if (!token) return;

    const heartbeat = () => {
      api.put('/user/last-seen').catch((err) => {
        console.error('💓 Heartbeat failed:', err);
      });
    };

    heartbeat();
    const interval = setInterval(heartbeat, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // 3. WebSocket connection — stable, tidak reconnect tiap navigasi
  const connect = useCallback(() => {
    if (tokenLoading || !token) return;

    // Cegah koneksi ganda
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const apiUrl = getApi();
    if (!apiUrl) return;

    // FIX: Tambah /api prefix — server expose /api/ws bukan /ws
    let baseURL = apiUrl.replace(/\/+$/, '');
    if (apiUrl.startsWith('/')) {
      baseURL = window.location.origin + baseURL;
    }
    // Hilangkan /api dari base jika sudah ada, lalu tambah /api/ws
    const cleanBase = baseURL.replace(/\/api$/, '');
    const wsUrl = cleanBase.replace(/^http/, 'ws') + '/api/ws';
    const fullWsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;

    console.log(`🔌 WebSocket: Connecting to ${wsUrl}...`);
    const socket = new WebSocket(fullWsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ WebSocket: Connected — realtime updates aktif');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset counter saat berhasil connect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : '';
        if (!text) return;

        // Server dapat mengirim beberapa pesan JSON dipisahkan oleh karakter newline (\n) dalam satu frame
        const lines = text.split('\n');
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          try {
            const data: WebSocketMessage = JSON.parse(trimmed);
            listenersRef.current.forEach((listener) => listener(data));
          } catch (lineErr) {
            console.error(
              '❌ WebSocket: Failed to parse individual message line:',
              trimmed,
              lineErr
            );
          }
        });
      } catch (err) {
        console.error('❌ WebSocket: Failed to process socket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log('⚠️ WebSocket: Disconnected', event.code, event.reason);
      setIsConnected(false);

      // Exponential backoff reconnect — tidak reconnect jika clean close (1000) atau logout (4001)
      if (event.code !== 1000 && event.code !== 4001 && token) {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000 // max 30 detik
          );
          reconnectAttemptsRef.current++;
          console.log(
            `🔌 WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.warn(
            '🔌 WebSocket: Max reconnect attempts reached. Giving up.'
          );
        }
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket: Error:', error);
      // onclose akan dipanggil setelah onerror, tidak perlu close manual
    };
  }, [token, tokenLoading]);

  // Poll for token changes in sessionStorage (e.g. after login, logout, or refresh)
  useEffect(() => {
    const checkToken = () => {
      const currentToken = getUserFromStorage()?.accessToken || null;
      if (currentToken !== token) {
        console.log(
          '🔌 WebSocket: Access token changed, updating connection...'
        );
        setToken(currentToken);
      }
    };

    const interval = setInterval(checkToken, 2000);
    return () => clearInterval(interval);
  }, [token]);

  // Reconnect on window focus if disconnected
  useEffect(() => {
    const handleFocus = () => {
      if (
        token &&
        (!socketRef.current ||
          socketRef.current.readyState === WebSocket.CLOSED)
      ) {
        console.log(
          '🔌 WebSocket: Window focused and socket is disconnected. Reconnecting...'
        );
        reconnectAttemptsRef.current = 0; // Reset attempts to try immediately
        connect();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [connect, token]);

  useEffect(() => {
    if (!tokenLoading && token) {
      connect();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect, token, tokenLoading]);

  const addListener = useCallback(
    (listener: (msg: WebSocketMessage) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  return { isConnected, addListener };
}
