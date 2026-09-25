'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { TOP_BOTTOM_COLORS } from '@/lib/type/top-bottom-colors';
import { round } from '@/lib/number';

interface WeeklyRankingChartProps {
  data: { day: string; totalQty: number }[];
  title?: string;
  unit?: string;
  titlePrefix?: string;
}

export function IWeeklyRankingChart({ data, title }: WeeklyRankingChartProps) {
  if (!data || !data.length) return null;

  return (
    <Card className="shadow-sm border border-gray-100 rounded-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 tracking-wider">
          {title || 'Weekly Ranking'}
        </h3>

        {/* Flex container: Chart kiri, Table kanan */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Chart kiri */}
          <div className="flex-1 min-w-[70%]">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis
                  type="category"
                  dataKey="day"
                  width={100}
                  stroke="#6b7280"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900 text-white text-sm p-2 rounded-sm shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p>Total Sales: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalQty" radius={[4, 4, 4, 4]}>
                  {data.map((d) => {
                    let fillColor = '#3b82f6';
                    if (d.totalQty === Math.max(...data.map((d) => d.totalQty)))
                      fillColor = TOP_BOTTOM_COLORS.top;
                    if (d.totalQty === Math.min(...data.map((d) => d.totalQty)))
                      fillColor = TOP_BOTTOM_COLORS.bottom;
                    return <Cell key={d.day} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabel kecil kanan */}
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-sm text-sm table-auto">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-gray-100">
                <tr>
                  <th className="px-1 py-0.5 text-center">#</th>
                  <th className="px-1 py-0.5 text-left">Day</th>
                  <th className="px-1 py-0.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, index) => (
                  <tr
                    key={d.day}
                    className={`even:bg-gray-50 hover:bg-gray-100 ${
                      d.totalQty === Math.max(...data.map((d) => d.totalQty))
                        ? 'font-semibold bg-green-50'
                        : d.totalQty ===
                            Math.min(...data.map((d) => d.totalQty))
                          ? 'font-semibold bg-red-50'
                          : ''
                    }`}
                  >
                    <td className="px-1 py-0.5 text-center">{index + 1}</td>
                    <td className="px-1 py-0.5">{d.day}</td>
                    <td className="px-1 py-0.5 text-right">
                      {round(d.totalQty, 0)?.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
