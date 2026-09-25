export const LoadingBar = ({ value = 0, height = 12 }) => {
  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{
        height,
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.04))',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)'
      }}
    >
      {/* Fill */}
      <div
        className="h-full rounded-full transition-all duration-200 ease-out"
        style={{
          width: `${value}%`,
          background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
          boxShadow: '0 0 8px rgba(59,130,246,0.5)'
        }}
      />

      {/* Subtle shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0.05))'
        }}
      />
    </div>
  );
};
