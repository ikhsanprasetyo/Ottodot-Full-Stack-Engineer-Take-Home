import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabItem<T extends string> = {
  value: T;
  label: string;
};

type GradientTabsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly TabItem<T>[];
  className?: string;

  disabled?: boolean;
  isLoading?: boolean;
};

export function GradientTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  disabled = false,
  isLoading = false
}: GradientTabsProps<T>) {
  const isDisabled = disabled || isLoading;

  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        if (isDisabled) return;
        onChange(v as T);
      }}
      className={className}
    >
      <TabsList
        className="
          flex gap-1
          rounded-sm
          border border-slate-200/60
          bg-gradient-to-r from-slate-100/80 via-white/70 to-slate-100/80
          backdrop-blur-md
          shadow-[0_8px_30px_rgba(0,0,0,0.08)]
        "
      >
        {options?.map((tab: any) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={isDisabled}
            className="
              relative
              px-5 py-2
              rounded-sm
              text-sm font-semibold
              text-slate-500
              transition-all duration-300
              hover:text-slate-900

              disabled:opacity-50
              disabled:pointer-events-none

              data-[state=active]:text-white
              data-[state=active]:bg-gradient-to-r
              data-[state=active]:from-indigo-600
              data-[state=active]:to-blue-500
              data-[state=active]:scale-[1.02]
              text-nowrap
            "
          >
            {tab.label}

            {/* glow line */}
            <span
              className="
                pointer-events-none
                absolute inset-x-2 -bottom-1
                h-[2px]
                rounded-full
                bg-gradient-to-r from-transparent via-white/70 to-transparent
                opacity-0
                data-[state=active]:opacity-100
              "
            />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
