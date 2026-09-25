export function createWorkerTask<TInput, TOutput>(workerUrl: URL) {
  return (payload: TInput): Promise<TOutput> => {
    return new Promise((resolve, reject) => {
      // ✅ Pastikan hanya di browser
      if (typeof window === 'undefined') {
        reject(new Error('Web Worker can only run in browser'));
        return;
      }

      const worker = new Worker(workerUrl, { type: 'module' });

      worker.onmessage = (e: MessageEvent<TOutput>) => {
        resolve(e.data);
        worker.terminate(); // penting biar gak leak memory
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage(payload);
    });
  };
}

type WasteItem = { qty: number; ratio: number };

export const runWasteCalc = createWorkerTask<WasteItem[], number>(
  new URL('./waste.worker.ts', import.meta.url)
);
