import { useCallback, useEffect, useRef, useState } from 'react';

export function useMedia() {
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const scrRef = useRef<MediaStream | null>(null);

  const startMic = useCallback(async () => {
    if (micRef.current) return micRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2,
      },
      video: false,
    });
    micRef.current = stream;
    setMicStream(stream);
    return stream;
  }, []);

  const stopMic = useCallback(() => {
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    setMicStream(null);
  }, []);

  const startScreen = useCallback(async () => {
    if (scrRef.current) return scrRef.current;
    // Prefer Electron desktopCapturer via preload API, fallback to getDisplayMedia
    try {
      const sources = await (window as any).electronAPI?.getSources?.(['screen']);
      if (sources && sources[0]) {
        const source = sources[0];
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
            },
          },
        });
        scrRef.current = stream; setScreenStream(stream); return stream;
      }
    } catch {}
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
    scrRef.current = stream; setScreenStream(stream); return stream;
  }, []);

  const stopScreen = useCallback(() => {
    scrRef.current?.getTracks().forEach((t) => t.stop());
    scrRef.current = null;
    setScreenStream(null);
  }, []);

  useEffect(() => {
    return () => {
      stopMic();
      stopScreen();
    };
  }, [stopMic, stopScreen]);

  return { micStream, screenStream, startMic, stopMic, startScreen, stopScreen };
}
