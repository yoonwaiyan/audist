import { useState, useEffect } from 'react';

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 480,
    animation: 'fadeIn 0.2s ease',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 28,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
  },
  input: {
    width: '100%',
    background: '#0d1424',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'monospace',
    outline: 'none',
    marginBottom: 20,
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 12,
    color: '#475569',
    marginTop: -14,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    background: '#1e293b',
    margin: '8px 0 24px',
  },
  row: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#475569',
    fontSize: 14,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 22px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg,#6ee7b7,#3b82f6)',
    color: '#0a0f1a',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  badge: {
    display: 'inline-block',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 20,
    fontWeight: 600,
    marginLeft: 8,
  },
};

export default function Settings({ onClose, onSave }) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [status, setStatus] = useState({ anthropicKeySet: false, openaiKeySet: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        setStatus(s);
        if (s.anthropicKey) setAnthropicKey(s.anthropicKey);
        if (s.openaiKey) setOpenaiKey(s.openaiKey);
      });
    }
  }, []);

  const handleSave = async () => {
    if (window.electronAPI) {
      await window.electronAPI.saveSettings({ anthropicKey, openaiKey });
    }
    setSaved(true);
    setTimeout(() => {
      onSave?.({ anthropicKeySet: !!anthropicKey, openaiKeySet: !!openaiKey });
      onClose();
    }, 800);
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <h2 style={S.title}>
          Settings
          {status.anthropicKeySet && (
            <span style={{ ...S.badge, background: '#064e3b', color: '#6ee7b7' }}>✓ API Key Set</span>
          )}
        </h2>
        <p style={S.subtitle}>
          API keys are stored locally on your device and never sent anywhere except the respective
          API providers.
        </p>

        <div style={S.divider} />

        <label style={S.label}>
          Anthropic API Key{' '}
          <span style={{ color: '#ef4444', fontWeight: 400, textTransform: 'none' }}>required</span>
        </label>
        <input
          style={S.input}
          type="password"
          placeholder="sk-ant-..."
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          autoComplete="off"
        />
        <p style={S.hint}>
          Used for AI summary generation. Get yours at{' '}
          <span style={{ color: '#6ee7b7' }}>console.anthropic.com</span>
        </p>

        <label style={S.label}>
          OpenAI API Key{' '}
          <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>
            optional – enables Whisper transcription
          </span>
        </label>
        <input
          style={S.input}
          type="password"
          placeholder="sk-..."
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          autoComplete="off"
        />
        <p style={S.hint}>
          If provided, after recording you can transcribe the full audio (including other
          participants) using OpenAI Whisper for a more accurate transcript.
        </p>

        <div style={S.divider} />

        <div style={S.row}>
          <button style={S.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...S.saveBtn,
              background: saved ? '#064e3b' : 'linear-gradient(135deg,#6ee7b7,#3b82f6)',
              color: saved ? '#6ee7b7' : '#0a0f1a',
            }}
            onClick={handleSave}
          >
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
