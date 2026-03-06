import { useState, useRef, useEffect, useCallback } from 'react';
import Waveform from './components/Waveform.jsx';
import Summary from './components/Summary.jsx';
import Settings from './components/Settings.jsx';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function speakerColor(speaker) {
  const colors = ['#6ee7b7', '#818cf8', '#f59e0b', '#38bdf8', '#f472b6', '#a3e635'];
  const idx = parseInt(speaker.replace(/\D/g, '') || '1', 10) - 1;
  return colors[idx % colors.length];
}

// ─── Transcript segment display ─────────────────────────────────────────────────

function TranscriptSegment({ speaker, text, timestamp }) {
  const color = speakerColor(speaker);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color,
            padding: '2px 8px',
            borderRadius: 20,
            background: color + '20',
            letterSpacing: 0.3,
          }}
        >
          {speaker}
        </span>
        <span style={{ fontSize: 11, color: '#334155' }}>{formatTime(timestamp)}</span>
      </div>
      <p
        style={{
          fontSize: 14,
          color: '#cbd5e1',
          lineHeight: 1.65,
          paddingLeft: 8,
          borderLeft: `2px solid ${color}40`,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
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
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'linear-gradient(135deg,#6ee7b7,#3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  logoText: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: '#f1f5f9' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  settingsBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid #1e293b',
    background: 'transparent',
    color: '#64748b',
    fontSize: 13,
    cursor: 'pointer',
  },
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: 12,
  },
  transcriptBox: {
    background: '#0d1424',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: '16px 20px',
    minHeight: 100,
    maxHeight: 280,
    overflowY: 'auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  recordBtn: (phase) => ({
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: 'none',
    cursor: phase === 'processing' ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    transition: 'all 0.25s',
    background:
      phase === 'recording'
        ? 'linear-gradient(135deg,#ef4444,#dc2626)'
        : phase === 'processing'
        ? '#1e293b'
        : 'linear-gradient(135deg,#6ee7b7,#3b82f6)',
    boxShadow:
      phase === 'recording'
        ? '0 0 0 12px rgba(239,68,68,0.12),0 0 0 28px rgba(239,68,68,0.05)'
        : phase === 'idle'
        ? '0 0 0 14px rgba(110,231,183,0.08)'
        : 'none',
  }),
  timer: (phase) => ({
    fontSize: 44,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-2px',
    color: phase === 'recording' ? '#6ee7b7' : '#334155',
  }),
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #1e293b',
    borderTop: '3px solid #6ee7b7',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState('idle'); // idle | recording | processing | done
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState([]); // {speaker, text, timestamp}
  const [interimText, setInterimText] = useState('');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [savedPath, setSavedPath] = useState(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // For the paste/edit transcript mode (post-recording)
  const [editMode, setEditMode] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');

  // Refs
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamsRef = useRef({ display: null, mic: null });
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const currentSpeakerRef = useRef(1);
  const lastSpeechTimeRef = useRef(0);
  const segmentsRef = useRef([]);
  const elapsedRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText]);

  // Load settings on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        setApiKeySet(s.anthropicKeySet);
        if (!s.anthropicKeySet) {
          setShowSettings(true);
        }
      });
    }
  }, []);

  // ─── Speech Recognition ──────────────────────────────────────────────────────

  const startSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal && text) {
          const now = elapsedRef.current;
          const gap = now - lastSpeechTimeRef.current;
          // New speaker if gap > 3 seconds
          if (lastSpeechTimeRef.current > 0 && gap > 3) {
            currentSpeakerRef.current += 1;
          }
          lastSpeechTimeRef.current = now;

          const speaker = `Speaker ${currentSpeakerRef.current}`;
          setSegments((prev) => {
            const last = prev[prev.length - 1];
            // Merge into same speaker block if within 2s
            if (last && last.speaker === speaker && now - last.timestamp < 2) {
              return [
                ...prev.slice(0, -1),
                { ...last, text: last.text + ' ' + text },
              ];
            }
            return [...prev, { speaker, text, timestamp: now }];
          });
          setInterimText('');
        } else {
          interim += text + ' ';
        }
      }
      setInterimText(interim.trim());
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic permission in System Settings.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        console.warn('Speech recognition error:', e.error);
      }
    };

    // Auto-restart on end (Web Speech times out after ~60s of silence)
    rec.onend = () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          rec.start();
        } catch {}
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
    }
  }, []);

  // ─── Start Recording ──────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError('');
    setInfo('');
    setSegments([]);
    setInterimText('');
    setElapsed(0);
    setSavedPath(null);
    setEditMode(false);
    currentSpeakerRef.current = 1;
    lastSpeechTimeRef.current = 0;
    elapsedRef.current = 0;

    let displayStream = null;
    let micStream = null;
    let sysAudio = false;

    // 1. Request system audio via getDisplayMedia
    // This shows the macOS/Windows system screen picker where user can enable audio sharing
    try {
      setInfo(
        'A screen picker will appear. Select your screen and enable "Share audio" to capture Zoom/Meet audio. Click Share to continue.'
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
          'ℹ System audio not captured. On macOS, check "Share audio" in the screen picker, or install BlackHole for system-wide capture. Recording mic audio only.'
        );
      }
    } catch (e) {
      setInfo('');
      if (e.name === 'NotAllowedError') {
        // User cancelled the picker – abort recording
        return;
      }
      // Permission or other error – fall back to mic only
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

    // 3. Set up AudioContext for mixing + visualization
    const audioCtx = new AudioContext({ sampleRate: 44100 });
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    const destination = audioCtx.createMediaStreamDestination();

    if (displayStream && sysAudio) {
      const sysSource = audioCtx.createMediaStreamSource(
        new MediaStream(displayStream.getAudioTracks())
      );
      sysSource.connect(analyser);
      sysSource.connect(destination);
    }

    if (micStream) {
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(analyser);
      micSource.connect(destination);
    }

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    streamsRef.current = { display: displayStream, mic: micStream };

    // 4. Start MediaRecorder on the mixed stream
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) =>
      MediaRecorder.isTypeSupported(t)
    ) || '';

    const recorder = new MediaRecorder(
      destination.stream,
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

    recorder.start(1000); // collect in 1-second chunks
    mediaRecorderRef.current = recorder;

    // 5. Start speech recognition (mic captures "your" voice in a Zoom call)
    if (micStream) {
      startSpeechRecognition();
    }

    // 6. Start timer
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    setPhase('recording');
  }, [startSpeechRecognition]);

  // ─── Stop Recording ───────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    // Stop speech recognition
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    // Stop MediaRecorder
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    // Stop all media streams
    const { display, mic } = streamsRef.current;
    display?.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    streamsRef.current = { display: null, mic: null };

    // Close AudioContext
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    // Stop timer
    clearInterval(timerRef.current);

    setPhase('processing');
    setInterimText('');
  }, []);

  // ─── Generate Summary ─────────────────────────────────────────────────────────

  const generateSummary = useCallback(
    async (transcriptText) => {
      if (!transcriptText.trim()) {
        setError('No transcript to summarize. Please record some audio first.');
        setPhase('idle');
        return;
      }

      try {
        let result;
        if (window.electronAPI) {
          result = await window.electronAPI.summarize({ transcript: transcriptText });
        } else {
          // Browser fallback (dev only – no API key security)
          throw new Error('Run in Electron to use the summary feature.');
        }

        const raw = result.content?.map((b) => b.text || '').join('') || '';
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        setSummary(parsed);
        setPhase('done');
      } catch (e) {
        setError(`Summary failed: ${e.message}. Check your Anthropic API key in Settings.`);
        setPhase('idle');
      }
    },
    []
  );

  // When processing starts, generate summary from current transcript
  useEffect(() => {
    if (phase !== 'processing') return;

    const transcriptText =
      segmentsRef.current.length > 0
        ? segmentsRef.current.map((s) => `${s.speaker}: ${s.text}`).join('\n')
        : '';

    if (!transcriptText.trim()) {
      // No transcript – show edit mode so user can paste manually
      setEditMode(true);
      setEditedTranscript('');
      setPhase('idle');
      setInfo('No speech was detected. You can paste your transcript below and generate a summary.');
      return;
    }

    setEditedTranscript(transcriptText);
    generateSummary(transcriptText);
  }, [phase, generateSummary]);

  // ─── Whisper Transcription (optional) ────────────────────────────────────────

  const transcribeWithWhisper = useCallback(async () => {
    if (!savedPath) return;
    setIsTranscribing(true);
    try {
      const result = await window.electronAPI.transcribeAudio({ audioPath: savedPath });
      if (result.segments) {
        const whisperSegments = result.segments.map((seg, i) => ({
          speaker: `Speaker ${i + 1}`, // Whisper-1 doesn't do diarization; this is a placeholder
          text: seg.text.trim(),
          timestamp: Math.floor(seg.start),
        }));
        setSegments(whisperSegments);
        const text = result.text || whisperSegments.map((s) => s.text).join(' ');
        setEditedTranscript(text);
        setInfo('Whisper transcription complete! Review the transcript, then generate summary.');
      }
    } catch (e) {
      setError(`Whisper transcription failed: ${e.message}`);
    } finally {
      setIsTranscribing(false);
    }
  }, [savedPath]);

  // ─── Reset ────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase('idle');
    setSummary(null);
    setSegments([]);
    setInterimText('');
    setElapsed(0);
    setError('');
    setInfo('');
    setSavedPath(null);
    setHasSystemAudio(false);
    setEditMode(false);
    setEditedTranscript('');
  }, []);

  // ─── Derived state ────────────────────────────────────────────────────────────

  const transcriptText =
    segments.map((s) => `${s.speaker}: ${s.text}`).join('\n') +
    (interimText ? `\nSpeaker ${currentSpeakerRef.current}: ${interimText}` : '');

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        textarea:focus { outline: none; border-color: #334155 !important; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🌾</div>
          <span style={S.logoText}>Audist</span>
        </div>
        <div style={S.headerRight}>
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
          <button style={S.settingsBtn} onClick={() => setShowSettings(true)}>
            ⚙ Settings
          </button>
          <span style={S.badge}>Beta</span>
        </div>
      </div>

      {/* Error/Info banners */}
      {error && <div style={S.errorBox}>⚠ {error}</div>}
      {info && !error && <div style={S.infoBox}>💡 {info}</div>}

      {/* ── DONE: Summary ── */}
      {phase === 'done' && summary && (
        <div style={{ width: '100%', maxWidth: 720 }}>
          <Summary
            summary={summary}
            savedPath={savedPath}
            onReset={reset}
            onRevealFile={() => window.electronAPI?.revealFile(savedPath)}
          />
        </div>
      )}

      {/* ── RECORDING / IDLE / PROCESSING ── */}
      {phase !== 'done' && (
        <div style={S.card}>
          {/* Processing spinner */}
          {phase === 'processing' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                padding: '40px 0',
              }}
            >
              <div style={S.spinner} />
              <span style={{ color: '#64748b', fontSize: 14 }}>Analysing with AI…</span>
            </div>
          )}

          {/* Recording controls */}
          {(phase === 'idle' || phase === 'recording') && (
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
                disabled={phase === 'processing'}
              >
                {phase === 'idle' ? '🎙' : '⏹'}
              </button>

              {/* Status label */}
              <p
                style={{
                  fontSize: 13,
                  color: '#64748b',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                {phase === 'idle' ? (
                  <>
                    Click to start — captures system audio (Zoom, Meet) + mic
                    <br />
                    <span style={{ color: '#334155', fontSize: 12 }}>
                      macOS: enable Screen Recording in System Settings → Privacy & Security
                    </span>
                  </>
                ) : (
                  'Recording… click to stop and generate summary'
                )}
              </p>

              {/* Live transcript */}
              {(phase === 'recording' || segments.length > 0) && (
                <div style={{ width: '100%' }}>
                  <p style={S.sectionLabel}>
                    Live Transcript
                    {hasSystemAudio && (
                      <span style={{ color: '#6ee7b7', marginLeft: 8, fontSize: 10, fontWeight: 400 }}>
                        · mic channel
                      </span>
                    )}
                  </p>
                  <div style={S.transcriptBox} ref={transcriptEndRef}>
                    {segments.length === 0 && !interimText ? (
                      <span style={{ color: '#334155', fontStyle: 'italic', fontSize: 14 }}>
                        Listening for speech…
                      </span>
                    ) : (
                      <>
                        {segments.map((seg, i) => (
                          <TranscriptSegment key={i} {...seg} />
                        ))}
                        {interimText && (
                          <p
                            style={{
                              fontSize: 14,
                              color: '#475569',
                              fontStyle: 'italic',
                              lineHeight: 1.65,
                            }}
                          >
                            {interimText}…
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── POST-RECORDING ACTIONS (when idle after having a recording) ── */}
      {phase === 'idle' && (savedPath || segments.length > 0 || editMode) && (
        <div style={S.card}>
          <p style={S.sectionLabel}>Post-Meeting Actions</p>

          {savedPath && (
            <div
              style={{
                padding: '10px 14px',
                background: '#0d1424',
                borderRadius: 10,
                border: '1px solid #1e293b',
                marginBottom: 16,
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
                {window.electronAPI && (
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid #1e293b',
                      background: isTranscribing ? '#1e293b' : '#1e293b',
                      color: isTranscribing ? '#475569' : '#60a5fa',
                      fontSize: 12,
                      cursor: isTranscribing ? 'default' : 'pointer',
                    }}
                    onClick={transcribeWithWhisper}
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? '⟳ Transcribing…' : '✦ Transcribe (Whisper)'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Editable transcript */}
          <p style={{ ...S.sectionLabel, marginBottom: 8 }}>
            Transcript{' '}
            <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>
              – review and edit before generating summary
            </span>
          </p>
          <textarea
            value={editedTranscript || transcriptText}
            onChange={(e) => setEditedTranscript(e.target.value)}
            style={{
              ...S.transcriptBox,
              minHeight: 140,
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#cbd5e1',
              background: '#0d1424',
              display: 'block',
              width: '100%',
              lineHeight: 1.7,
            }}
            placeholder="Transcript will appear here after recording. You can also paste a transcript manually."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <button
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: '#475569',
                fontSize: 14,
                cursor: 'pointer',
              }}
              onClick={reset}
            >
              ← New Meeting
            </button>
            <button
              style={{
                padding: '11px 28px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg,#6ee7b7,#3b82f6)',
                color: '#0a0f1a',
                fontWeight: 700,
                fontSize: 14,
              }}
              onClick={() => {
                const text = editedTranscript || transcriptText;
                setPhase('processing');
                setTimeout(() => generateSummary(text), 100);
              }}
            >
              ✨ Generate Summary
            </button>
          </div>
        </div>
      )}

      {/* ── IDLE EMPTY STATE ── */}
      {phase === 'idle' && !savedPath && segments.length === 0 && !editMode && (
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
          <p>Real-time transcript · Speaker labels · AI-powered summary</p>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onSave={(s) => setApiKeySet(s.anthropicKeySet)}
        />
      )}
    </div>
  );
}
