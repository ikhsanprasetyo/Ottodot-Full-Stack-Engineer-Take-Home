export const highlightText = (text: string, keyword: string) => {
  if (!keyword) return text;

  const regex = new RegExp(`(${keyword})`, 'gi');
  const parts = String(text).split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm">
        {part}
      </span>
    ) : (
      part
    )
  );
};
