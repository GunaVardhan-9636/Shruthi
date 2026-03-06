import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  stream: MediaStream | null;
  color?: string;
}

export function AudioWaveform({ stream, color = '#00ff9c' }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    // Initialize Web Audio API
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128; // gives 64 frequency bins
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    try {
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (e) {
      console.error("Failed to connect audio stream to analyser", e);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    // We only use the lower frequencies which contain voice energy
    const vocalBins = Math.floor(bufferLength * 0.7); 
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);

      if (!canvas || !ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;

      analyser.getByteFrequencyData(dataArray);

      // Clear the canvas with transparent background
      ctx.clearRect(0, 0, width, height);

      // We will draw symmetric bars stemming from the vertical center
      const barWidth = (width / vocalBins) - 1.5;
      let x = 0;
      
      const centerY = height / 2;

      for (let i = 0; i < vocalBins; i++) {
        // value is 0-255. Voice normally hovers lower. Boost it smoothly.
        const normalized = dataArray[i] / 255.0; 
        const easeNormalized = Math.pow(normalized, 1.5); // easing
        
        // Min bar height is 2px even for silence, max is height/2
        const barHeight = Math.max(2, easeNormalized * (height / 2));

        // Create glowing style
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 4);
        ctx.fill();

        x += barWidth + 1.5;
      }
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // Clean up Audio node graph
      if (sourceRef.current) sourceRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, [stream, color]);

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: `1px solid ${color}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', color: color, letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}`, animation: 'pulse 1.5s infinite' }} />
        LIVE AUDIO SCAN IN PROGRESS...
      </div>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={80} 
        style={{ width: '100%', height: '80px', pointerEvents: 'none' }}
      />
    </div>
  );
}
