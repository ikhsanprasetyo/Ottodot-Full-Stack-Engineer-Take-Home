'use client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { TOP_BOTTOM_COLORS } from '@/lib/type/top-bottom-colors';
import { CustomTooltip } from './custom-tooltip';

interface RankingBarChartProps {
  title: string;
  data: { name: string; totalQty: number }[];
  color?: string;
  height?: number;
  showGrid?: boolean;
}

export function IRankingBarChart({
  title,
  data,
  color = TOP_BOTTOM_COLORS.top,
  height = 220,
  showGrid = true
}: RankingBarChartProps) {
  // ───── Custom Tooltip ─────

  return (
    <Card className="shadow-sm border border-gray-100 rounded-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 tracking-wider">
          {title}
        </h3>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical">
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis type="number" stroke="#6b7280" />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              stroke="#6b7280"
            />
            <Tooltip content={CustomTooltip} />
            <Bar dataKey="totalQty" fill={color} radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
