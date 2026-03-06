import { useEffect, useRef, useState } from 'react';

const BAR_COUNT = 16;

export default function Waveform({ active, analyserRef }) {
  const [levels, setLevels] = useState(Array(BAR_COUNT).fill(0));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active || !analyserRef?.current) {
      setLevels(Array(BAR_COUNT).fill(0));
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function update() {
      analyser.getByteFrequencyData(dataArray);
      const step = Math.floor(dataArray.length / BAR_COUNT);
      const newLevels = Array.from({ length: BAR_COUNT }, (_, i) => {
        // Weight towards lower frequencies (more musical/speech-like)
        const idx = Math.floor(i * step * 0.6);
        return dataArray[idx] / 255;
      });
      setLevels(newLevels);
      rafRef.current = requestAnimationFrame(update);
    }

    update();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, analyserRef]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: 44,
        padding: '0 4px',
      }}
    >
      {levels.map((level, i) => {
        const height = active ? Math.max(4, level * 40) : 5;
        const isEdge = i === 0 || i === BAR_COUNT - 1;
        const isMid = Math.abs(i - BAR_COUNT / 2) < 2;
        return (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              flexShrink: 0,
              background: active
                ? isMid
                  ? '#a7f3d0'
                  : isEdge
                  ? '#1d4ed8'
                  : '#6ee7b7'
                : '#1e293b',
              height: `${height}px`,
              transition: active ? 'height 0.04s ease' : 'height 0.3s ease, background 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
}
