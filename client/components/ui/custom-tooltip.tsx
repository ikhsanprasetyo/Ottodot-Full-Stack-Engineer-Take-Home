export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-sm p-2 rounded-sm shadow-lg">
        <p className="font-semibold">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey}>
            {p.name || p.dataKey}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};
