/// <reference lib="webworker" />

type WasteItem = { qty: number; ratio: number };

self.onmessage = (e: MessageEvent<WasteItem[]>) => {
  const data = e.data;

  let total = 0;
  for (let i = 0; i < data.length; i++) {
    total += data[i].qty * data[i].ratio;
  }

  self.postMessage(total);
};
