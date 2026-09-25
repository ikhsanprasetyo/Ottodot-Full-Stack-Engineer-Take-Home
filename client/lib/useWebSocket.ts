import { useEffect, useRef } from 'react';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || 'wss://serverottodot.byteseeker.net/ws';

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Replace http(s) with ws(s) if needed
    let socketUrl = WS_URL;
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
