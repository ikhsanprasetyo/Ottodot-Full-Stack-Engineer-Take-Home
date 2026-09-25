import { useEffect, useRef } from 'react';

const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  ) {
    return 'ws://localhost:9050/ws';
  }
  return 'wss://serverottodot.byteseeker.net/ws';
};

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let socketUrl = getWsUrl();
    if (typeof window !== 'undefined' && socketUrl.startsWith('http')) {
      socketUrl = socketUrl.replace(/^http/, 'ws');
    }

    try {
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessage(parsed);
        } catch (e) {
          console.error('WebSocket parse error', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };

      return () => {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      };
    } catch (e) {
      console.warn('WebSocket init failed:', e);
    }
  }, [onMessage]);
}
