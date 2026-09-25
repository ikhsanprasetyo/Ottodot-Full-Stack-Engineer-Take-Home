import { useRef } from 'react';

export function useVisibleCounter() {
  const counterRef = useRef(0);

  const getNext = () => {
    counterRef.current += 1;
    return counterRef.current;
  };

  const reset = () => {
    counterRef.current = 0;
  };

  return { getNext, reset };
}
