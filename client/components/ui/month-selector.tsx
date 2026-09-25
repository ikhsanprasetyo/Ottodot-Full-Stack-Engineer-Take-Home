'use client';

import { setDateStr } from '@/lib/date';
import dayjs from 'dayjs';

type MonthSelectorProps = {
  value?: string; // format "YYYY-MM-DD"
  onChange: (dateStr: string) => void; // tetap format "YYYY-MM-DD"
  day?: string; // ex: '31'
};

export function MonthSelector({
  value,
  onChange,
  day = '01'
}: MonthSelectorProps) {
  // convert value "YYYY-MM-DD" ke input month ("YYYY-MM")
  const selectedMonth = value
    ? dayjs(value).format('YYYY-MM')
    : setDateStr(new Date(), 'YYYY-MM');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const monthStr = e.target.value; // "YYYY-MM"
    // kembalikan ke "YYYY-MM-DD"
    onChange(dayjs(`${monthStr}-${day}`).format('YYYY-MM-DD'));
  };

  return (
    <input
      type="month"
      value={selectedMonth}
      onChange={handleChange}
      className="border p-1 rounded-sm"
    />
  );
}
