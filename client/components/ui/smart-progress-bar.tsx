'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

export const SmartProgressBar = ({ value }: { value: number }) => {
  const data = [{ name: 'p', value }];

  return (
    <div className="w-full h-2.5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" hide />
          <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
