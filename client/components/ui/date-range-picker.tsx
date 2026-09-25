'use client';

interface DateRangePickerProps {
  start: string;
  end: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
}

export function DateRangePicker({
  start,
  end,
  onStartChange,
  onEndChange
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md shadow-sm">
      <div className="flex flex-col items-start">
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">
          From
        </span>
        <input
          type="date"
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          max={end || undefined}
          className="text-xs font-medium text-gray-700 border-none outline-none bg-transparent cursor-pointer w-[118px]"
        />
      </div>
      <span className="text-gray-300 font-light text-sm select-none">→</span>
      <div className="flex flex-col items-start">
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">
          To
        </span>
        <input
          type="date"
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          min={start || undefined}
          className="text-xs font-medium text-gray-700 border-none outline-none bg-transparent cursor-pointer w-[118px]"
        />
      </div>
    </div>
  );
}
