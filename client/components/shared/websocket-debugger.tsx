'use client';

import React from 'react';
import { getApi } from '@/lib/utils';

interface WebSocketDebuggerProps {
  isConnected: boolean;
  messages: string[];
}

export function WebSocketDebugger({
  isConnected,
  messages
}: WebSocketDebuggerProps) {
  const apiUrl = getApi();
  let wsUrl = '';
  if (apiUrl) {
    const baseURL = apiUrl.replace(/\/+$/, '');
    const cleanBase = baseURL.replace(/\/api$/, '');
    wsUrl = cleanBase.replace(/^http/, 'ws') + '/api/ws';
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-slate-950 text-white p-3 rounded-sm shadow-xl text-[10px] font-mono border border-slate-800 max-w-xs space-y-1.5 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex flex-col space-y-0.5 border-b border-slate-800 pb-1.5 mb-1 text-gray-400">
        <div className="truncate">
          <span className="font-bold text-gray-300">API:</span>{' '}
          {apiUrl || 'None'}
        </div>
        <div className="truncate">
          <span className="font-bold text-gray-300">WS:</span> {wsUrl || 'None'}
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="font-bold">🔌 WS Status:</span>
        <span
          className={
            isConnected
              ? 'text-emerald-400 font-bold'
              : 'text-red-400 font-bold'
          }
        >
          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {messages.length === 0 ? (
          <span className="text-gray-500 italic">No events yet</span>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="leading-tight">
              {m}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
