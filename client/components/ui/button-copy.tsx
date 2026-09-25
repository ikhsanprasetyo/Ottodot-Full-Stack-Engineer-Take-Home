import { Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils'; // pastikan punya util className helper

export const ButtonCopy = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1 text-muted-foreground hover:text-black"
      title="Copy to clipboard"
    >
      <Copy className={cn('w-3.5 h-3.5', copied && 'text-green-500')} />
    </button>
  );
};
