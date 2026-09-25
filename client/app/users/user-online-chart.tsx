'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useGetUserOnlineHistory } from '@/lib/hooks/queries/user';
import { setDateStr } from '@/lib/date';

export function UserOnlineChart({ maxLineValue }: { maxLineValue?: number }) {
  const [timeframe, setTimeframe] = useState('1d');
  const { data, isLoading } = useGetUserOnlineHistory(timeframe);

  const timeDomain = useMemo(() => {
    const now = new Date().getTime();
    let start = now;
    switch (timeframe) {
      case '4h':
        start = now - 4 * 3600 * 1000;
        break;
      case '1d':
        start = now - 24 * 3600 * 1000;
        break;
      case '1w':
        start = now - 7 * 24 * 3600 * 1000;
        break;
      case '1m':
        start = now - 30 * 24 * 3600 * 1000;
        break;
      case '3m':
        start = now - 90 * 24 * 3600 * 1000;
        break;
    }
    return [start, now];
  }, [timeframe]);

  const chartData = useMemo(() => {
    if (!data?.data) return [];

    // Map data and format for chart
    return data.data.map((item: any) => ({
      ...item,
      timeMs: new Date(item.timestamp).getTime(),
      formattedTime: setDateStr(item.timestamp, 'MMM DD HH:mm')
    }));
  }, [data]);

  // Find the peak
  const peak = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return Math.max(...chartData.map((d: any) => d.active_count || 0));
  }, [chartData]);

  const current = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return chartData[chartData.length - 1].active_count || 0;
  }, [chartData]);

  const timeframes = [
    { value: '4h', label: '4-Hours' },
    { value: '1d', label: '1-Day' },
    { value: '1w', label: '1-Week' },
    { value: '1m', label: '1-Month' },
    { value: '3m', label: '3-Months' }
  ];

  const getPeakLabel = () => {
    switch (timeframe) {
      case '4h':
        return '4-Hours Peak';
      case '1d':
        return '24-Hour Peak';
      case '1w':
        return '7-Day Peak';
      case '1m':
        return '30-Day Peak';
      case '3m':
        return '90-Day Peak';
      default:
        return 'Peak';
    }
  };

  let lastDateStr = '';

  return (
    <div className="w-full bg-white rounded-sm border border-gray-200 overflow-hidden flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 tracking-wide">
              Grafik Aktivitas Pengguna
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              Memantau statistik pengguna online secara real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 mt-4 md:mt-0">
          <div className="flex flex-col items-end">
            <div className="text-2xl font-bold text-emerald-600">
              {current.toLocaleString()}
            </div>
            <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
              Online Right Now
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-2xl font-bold text-slate-700">
              {peak.toLocaleString()}
            </div>
            <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
              {getPeakLabel()}
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe Controls */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-end gap-2">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors ${
              timeframe === tf.value
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-gray-200'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className="w-full h-[350px] p-4 bg-white">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center animate-pulse bg-slate-50 rounded-sm border border-dashed border-gray-200">
            <span className="text-slate-400 text-xs font-semibold">
              Memuat data grafik...
            </span>
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-sm border border-dashed border-gray-200">
            <div className="text-slate-400 text-xs font-semibold">
              Belum ada data aktivitas tersedia.
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Data akan muncul setelah sistem merekam aktivitas pengguna.
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timeMs"
                type="number"
                scale="time"
                domain={timeDomain}
                tickFormatter={(val, index) => {
                  if (index === 0) {
                    lastDateStr = '';
                  }
                  const d = new Date(val);
                  const datePart = setDateStr(d.toISOString(), 'DD MMM');
                  const timePart = setDateStr(d.toISOString(), 'HH:mm');
                  if (datePart !== lastDateStr) {
                    lastDateStr = datePart;
                    return `${datePart} ${timePart}`;
                  }
                  return timePart;
                }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                minTickGap={50}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(value) => `${value}`}
                allowDecimals={false}
                domain={
                  maxLineValue !== undefined
                    ? [0, Math.max(1, maxLineValue)]
                    : undefined
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dPoint = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white border border-slate-800 p-3 rounded-sm shadow-xl text-xs">
                        <div className="text-slate-400 mb-1">
                          {dPoint.formattedTime}
                        </div>
                        <div className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm bg-emerald-400" />
                          {payload[0]?.value?.toLocaleString()}{' '}
                          {payload[0]?.value === 1 ? 'User' : 'Users'}
                        </div>
                        {dPoint.userNames && (
                          <div className="mt-2 text-[10px] text-slate-300 max-w-[200px] break-words leading-relaxed opacity-90 border-t border-slate-800 pt-2">
                            <span className="text-slate-400 block mb-0.5 font-semibold">
                              User Aktif:
                            </span>
                            {dPoint.userNames}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="active_count"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActive)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
