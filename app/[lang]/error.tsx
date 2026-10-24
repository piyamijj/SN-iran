'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container py-24 text-center">
      <p className="text-muted-foreground">Error · خطا · Hata</p>
      <button onClick={reset} className="mt-4 rounded-full border border-oled-border px-5 py-2 font-semibold">↻</button>
    </div>
  );
}
