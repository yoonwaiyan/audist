import { useState, useRef, useCallback } from 'react';
import logo from './assets/logo.svg';
import Waveform from './components/Waveform.jsx';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  app: {
    minHeight: '100vh',
    background: '#0a0f1a',
    color: '#e2e8f0',
    fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
    padding: '0 16px 60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 720,
    padding: '28px 0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoText: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: '#f1f5f9' },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 20,
    background: '#1e293b',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    background: '#111827',
    borderRadius: 20,
    border: '1px solid #1e293b',
    padding: 32,
    marginBottom: 16,
  },
  errorBox: {
    background: '#1c0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: 14,
    width: '100%',
    maxWidth: 720,
    marginBottom: 14,
  },
  infoBox: {
    background: '#0c1424',
    border: '1px solid #1e3a5f',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#7dd3fc',
    fontSize: 13,
    width: '100%',
    maxWidth: 720,
    marginBottom: 14,
    lineHeight: 1.6,
  },
  recordBtn: (phase) => ({
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    transition: 'all 0.25s',
    background:
      phase === 'recording'
        ? 'linear-gradient(135deg,#ef4444,#dc2626)'
        : 'linear-gradient(135deg,#6ee7b7,#3b82f6)',
    boxShadow:
      phase === 'recording'
        ? '0 0 0 12px rgba(239,68,68,0.12),0 0 0 28px rgba(239,68,68,0.05)'
        : '0 0 0 14px rgba(110,231,183,0.08)',
  }),
  timer: (phase) => ({
    fontSize: 44,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-2px',
    color: phase === 'recording' ? '#6ee7b7' : '#334155',
  }),
};

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState('idle'); // idle | recording
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [savedPath, setSavedPath] = useState(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamsRef = useRef({ display: null, mic: null });
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);

  // ─── Start Recording ──────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError('');
    setInfo('');
    setElapsed(0);
    setSavedPath(null);

    let displayStream = null;
    let micStream = null;
    let sysAudio = false;

    // 1. Request system audio via getDisplayMedia
    try {
      setInfo(
        'A screen picker will appear. Select your screen and enable "Share audio" to capture system audio. Click Share to continue.'
      );
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1 },
          height: { ideal: 1 },
          frameRate: { ideal: 1 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 2,
        },
      });
      sysAudio = displayStream.getAudioTracks().length > 0;
      setHasSystemAudio(sysAudio);
      setInfo('');

      if (!sysAudio) {
        setInfo(
          'ℹ System audio not captured. In the screen picker, select your screen (not a window) and check "Share audio". Requires macOS Sequoia (15+). Recording mic only.'
        );
      }
    } catch (e) {
      setInfo('');
      if (e.name === 'NotAllowedError') {
        return;
      }
      setInfo('ℹ Screen capture unavailable. Recording mic only.');
    }

    // 2. Request microphone
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
    } catch (e) {
      if (!displayStream) {
        setError('No audio source available. Please grant microphone permission and try again.');
        return;
      }
      setInfo((prev) => prev + ' Mic unavailable – recording system audio only.');
    }

    if (!displayStream && !micStream) {
      setError('Failed to access any audio source.');
      return;
    }

    // 3. Combine system audio + mic into a single recording stream
    const audioTracks = [
      ...(sysAudio ? displayStream.getAudioTracks() : []),
      ...(micStream ? micStream.getAudioTracks() : []),
    ];

    if (audioTracks.length === 0) {
      setError('No recordable audio source found. Please grant microphone access and try again.');
      displayStream?.getTracks().forEach((t) => t.stop());
      return;
    }

    const recordingStream = new MediaStream(audioTracks);

    try {
      const audioCtx = new AudioContext();
      await audioCtx.resume();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      const source = audioCtx.createMediaStreamSource(recordingStream);
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
    } catch (e) {
      console.warn('AudioContext visualization failed (non-critical):', e.message);
    }

    streamsRef.current = { display: displayStream, mic: micStream };

    // 4. Start MediaRecorder on the recording stream
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) =>
      MediaRecorder.isTypeSupported(t)
    ) || '';

    const recorder = new MediaRecorder(
      recordingStream,
      mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined
    );

    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });

      if (window.electronAPI) {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const ext = (recorder.mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm';
          const fp = await window.electronAPI.saveAudio({
            buffer: Array.from(new Uint8Array(arrayBuffer)),
            ext,
          });
          setSavedPath(fp);
        } catch (e) {
          console.warn('Failed to save audio file:', e);
        }
      }
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;

    // 5. Start timer
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    setPhase('recording');
  }, []);

  // ─── Stop Recording ───────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    const { display, mic } = streamsRef.current;
    display?.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    streamsRef.current = { display: null, mic: null };

    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    clearInterval(timerRef.current);

    setPhase('idle');
  }, []);

  // ─── Reset ────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase('idle');
    setElapsed(0);
    setError('');
    setInfo('');
    setSavedPath(null);
    setHasSystemAudio(false);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={S.logo}>
          <img src={logo} alt="Audist" style={{ width: 34, height: 34 }} onError={(e) => e.target.style.display = 'none'} />
          <span style={S.logoText}>Audist</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {phase === 'recording' && (
            <span
              style={{
                fontSize: 12,
                color: '#ef4444',
                animation: 'pulse 1.5s infinite',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'inline-block',
                }}
              />
              REC
            </span>
          )}
          {hasSystemAudio && phase === 'recording' && (
            <span
              style={{
                fontSize: 11,
                color: '#6ee7b7',
                padding: '2px 8px',
                borderRadius: 20,
                background: '#064e3b',
              }}
            >
              🔊 System audio
            </span>
          )}
          <span style={S.badge}>Beta</span>
        </div>
      </div>

      {/* Error/Info banners */}
      {error && <div style={S.errorBox}>⚠ {error}</div>}
      {info && !error && <div style={S.infoBox}>💡 {info}</div>}

      {/* Recording controls */}
      <div style={S.card}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Timer */}
          <div style={S.timer(phase)}>{formatTime(elapsed)}</div>

          {/* Waveform */}
          <div style={{ width: '100%' }}>
            <Waveform active={phase === 'recording'} analyserRef={analyserRef} />
          </div>

          {/* Record button */}
          <button
            style={S.recordBtn(phase)}
            onClick={phase === 'idle' ? startRecording : stopRecording}
          >
            {phase === 'idle' ? '🎙' : '⏹'}
          </button>

          {/* Status label */}
          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
            {phase === 'idle' ? (
              <>
                Click to start — captures system audio (Zoom, Meet) + mic
                <br />
                <span style={{ color: '#334155', fontSize: 12 }}>
                  macOS: enable Screen Recording in System Settings → Privacy & Security
                </span>
              </>
            ) : (
              'Recording… click to stop'
            )}
          </p>
        </div>
      </div>

      {/* Saved file info */}
      {phase === 'idle' && savedPath && (
        <div style={S.card}>
          <div
            style={{
              padding: '10px 14px',
              background: '#0d1424',
              borderRadius: 10,
              border: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>Recording saved</p>
              <p style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                {savedPath.split('/').pop()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #1e293b',
                  background: '#1e293b',
                  color: '#94a3b8',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => window.electronAPI?.revealFile(savedPath)}
              >
                Show in Finder
              </button>
              <button
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #1e293b',
                  background: 'transparent',
                  color: '#475569',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={reset}
              >
                ← New Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Idle empty state */}
      {phase === 'idle' && !savedPath && (
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            textAlign: 'center',
            color: '#334155',
            fontSize: 13,
            lineHeight: 1.8,
            padding: '8px 0',
          }}
        >
          <p>Captures <strong style={{ color: '#475569' }}>system audio</strong> from Zoom, Google Meet, Teams + your mic</p>
        </div>
      )}
    </div>
  );
}
