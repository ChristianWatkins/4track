'use client';

interface CounterProps {
  position: number;
  counterPosition: number;
  onReset: () => void;
}

export default function Counter({ position, counterPosition, onReset }: CounterProps) {
  // Calculate relative time from counter reference point
  const relativeTime = position - counterPosition;
  
  const formatTime = (seconds: number): string => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  return (
    <div className="flex items-center justify-center gap-5 my-5">
      <button
        onClick={onReset}
        className="bg-cassette-orange text-black border-none px-5 py-2.5 text-sm font-bold rounded-[5px] uppercase transition-all hover:bg-[#ff8c00] hover:scale-105"
        title="Sett nåværende posisjon som 00:00"
      >
        Reset
      </button>
      <div className={`bg-black border-2 border-cassette-orange px-8 py-4 text-[32px] font-bold rounded-[8px] min-w-[170px] text-center font-mono shadow-[inset_0_0_10px_rgba(255,165,0,0.3)] ${relativeTime < 0 ? 'text-red-500' : 'text-cassette-orange'}`}>
        {formatTime(relativeTime)}
      </div>
    </div>
  );
}
