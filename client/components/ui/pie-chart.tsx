'use client';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { PIE_COLORS } from '@/lib/type/pie-colors';
import { motion } from 'framer-motion';
import { round } from '@/lib/number';

interface PieData {
  name: string;
  value: number;
}

interface IPieChartProps {
  pieData: PieData[];
  total?: number;
  productType?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
  colors?: string[];
  unit?: string;
}

export function IPieChart({
  pieData,
  total = 0,
  productType,
  height = 350,
  innerRadius = 70,
  outerRadius = 120,
  showLabel = true,
  colors = PIE_COLORS,
  unit = 'pcs'
}: IPieChartProps) {
  return (
    <Card className="shadow-sm border border-gray-100 rounded-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 tracking-wider">
          Contribution {productType && `(${productType})`}
        </h3>

        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            {/* Gradient slices */}
            <defs>
              {pieData.map((_, index) => (
                <linearGradient
                  key={`grad-${index}`}
                  id={`grad-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="100%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.5}
                  />
                </linearGradient>
              ))}
            </defs>

            <Pie
              data={pieData as any}
              dataKey="value"
              nameKey="name"
              cx="45%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={4}
              labelLine={true}
              label={
                showLabel
                  ? ({ cx, cy, midAngle, outerRadius, percent, name }) => {
                      if (
                        cx === undefined ||
                        cy === undefined ||
                        outerRadius === undefined ||
                        midAngle === undefined ||
                        percent === undefined
                      )
                        return null;
                      if (percent * 100 < 2) return null;

                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#374151"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight={500}
                        >
                          {`${name}: ${(percent * 100).toFixed(1)}%`}
                        </text>
                      );
                    }
                  : undefined
              }
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} />
              ))}
            </Pie>

            {/* Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="bg-gray-900 text-white text-sm p-2 rounded-sm shadow-lg">
                      <p className="font-semibold">{data?.name}</p>
                      <p>{(Number(data?.value) || 0).toFixed(1)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Legend */}
            <Legend
              layout="vertical"
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                top: 0,
                right: 0
              }}
            />

            {/* Total di tengah donut, pakai framer-motion */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <text
                x="90%"
                y="90%"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                <tspan fontSize="28px" fontWeight="bold" fill="#0ea5e9">
                  {round(total, 0)?.toLocaleString('id-ID')}
                </tspan>
                <tspan fontSize="14px" fill="#9ca3af" dx={4}>
                  {unit}
                </tspan>
              </text>
            </motion.g>
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
