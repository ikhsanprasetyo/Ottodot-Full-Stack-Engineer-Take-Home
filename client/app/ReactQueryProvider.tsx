'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient
} from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { WebSocketDebugger } from '@/components/shared/websocket-debugger';
import { getLocalStorageSettings, isBoolean } from '@/lib/localStorage';

function mapServerKeyToQueryKey(serverKey: string): any[][] {
  // If the server key is "outlet", we invalidate both ['outlets'] and ['outlet']
  if (serverKey === 'outlet') {
    return [['outlets'], ['outlet']];
  }

  if (serverKey === 'rtu-batches') {
    return [['rtu-production-batches']];
  }

  // Handle single entity IDs
  const prefixesWithId = [
    { serverPrefix: 'rtu-category-', clientPrefix: 'rtu-category' },
    { serverPrefix: 'rtu-distribution-', clientPrefix: 'rtu-distribution' },
    { serverPrefix: 'rtu-grn-', clientPrefix: 'rtu-grn' },
    { serverPrefix: 'rtu-material-price-', clientPrefix: 'rtu-material-price' },
    {
      serverPrefix: 'rtu-material-ledger-',
      clientPrefix: 'rtu-material-ledger'
    },
    { serverPrefix: 'rtu-material-', clientPrefix: 'rtu-material' },
    { serverPrefix: 'rtu-batch-', clientPrefix: 'rtu-production-batch' },
    { serverPrefix: 'rtu-purchase-', clientPrefix: 'rtu-purchase' },
    { serverPrefix: 'rtu-unit-', clientPrefix: 'rtu-unit' },
    { serverPrefix: 'rtu-vendor-', clientPrefix: 'rtu-vendor' }
  ];

  for (const item of prefixesWithId) {
    if (serverKey.startsWith(item.serverPrefix)) {
      const id = serverKey.slice(item.serverPrefix.length);
      return [[item.clientPrefix, id]];
    }
  }

  // Fallback: return as a single element array
  return [[serverKey]];
}

function WebSocketListener({ children }: { children: ReactNode }) {
  const { addListener, isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<string[]>([]);
  const [wsDebuggerEnabled, setWsDebuggerEnabled] = useState(false);

  useEffect(() => {
    const checkSettings = () => {
      const saved = getLocalStorageSettings(
        'settings',
        'wsDebuggerEnabled',
        isBoolean
      );
      setWsDebuggerEnabled(Boolean(saved));
    };
    checkSettings();
    window.addEventListener('settings-updated', checkSettings);
    return () => window.removeEventListener('settings-updated', checkSettings);
  }, []);

  useEffect(() => {
    const removeListener = addListener((msg) => {
      const time = new Date().toLocaleTimeString();
      setMessages((prev) => [
        `[${time}] ${msg.type}: ${JSON.stringify(msg.payload)}`,
        ...prev.slice(0, 4)
      ]);

      // Handle generic query invalidation
      if (msg.type === 'invalidate_query') {
        const payload = msg.payload;
        const keysToInvalidate: string[] = Array.isArray(payload)
          ? payload
          : [payload];

        keysToInvalidate.forEach((serverKey) => {
          const mappedKeys = mapServerKeyToQueryKey(serverKey);
          mappedKeys.forEach((queryKey) => {
            console.log(
              `🔄 Real-time update: invalidating & refetching query key`,
              queryKey
            );

            // Debug: log all active query keys in the cache to check for mismatches
            try {
              const allQueries = queryClient.getQueryCache().getAll();
              const activeKeys = allQueries
                .filter((q) => q.isActive())
                .map((q) => q.queryKey);
              console.log('🔍 Active Query Keys in Cache:', activeKeys);
            } catch (e) {
              console.error('Debug cache log error:', e);
            }

            queryClient.invalidateQueries({
              queryKey,
              exact: false,
              refetchType: 'all'
            });
            queryClient.refetchQueries({ queryKey, exact: false, type: 'all' });
          });
        });
      }

      // Handle specific user status changes
      if (msg.type === 'user_status') {
        console.log('👤 User status updated:', msg.payload);
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    });

    return () => removeListener();
  }, [addListener, queryClient]);

  return (
    <>
      {children}
      {wsDebuggerEnabled && (
        <WebSocketDebugger isConnected={isConnected} messages={messages} />
      )}
    </>
  );
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketListener>{children}</WebSocketListener>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
