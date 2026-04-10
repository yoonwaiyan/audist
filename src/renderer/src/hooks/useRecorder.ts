import { useRef, useState, useCallback, type RefObject } from 'react'

export type RecordingState = 'idle' | 'recording' | 'stopping'

export interface UseRecorderResult {
  state: RecordingState
  sessionDir: string | null
  error: string | null
  analyserRef: React.RefObject<AnalyserNode | null>
  startRecording: () => Promise<void>
  stopRecording: (elapsed: number) => Promise<void>
}

// Connects a MediaStream to an AudioWorklet that converts Float32 → Int16 PCM
// and forwards each chunk via the provided callback.
async function createPcmCapture(
  stream: MediaStream,
  sampleRate: number,
  onChunk: (chunk: Uint8Array) => void
): Promise<{ audioContext: AudioContext; cleanup: () => void }> {
  const audioContext = new AudioContext({ sampleRate })
  const workletUrl = new URL('./worklets/system-audio-processor.js', window.location.href).href
  await audioContext.audioWorklet.addModule(workletUrl)

  const source = audioContext.createMediaStreamSource(stream)
  const workletNode = new AudioWorkletNode(audioContext, 'system-audio-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1
  })

  workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>): void => {
    onChunk(new Uint8Array(e.data))
  }

  // Connect to a silent gain node to keep the audio graph alive without speaker output
  const silencer = audioContext.createGain()
  silencer.gain.value = 0
  source.connect(workletNode)
  workletNode.connect(silencer)
  silencer.connect(audioContext.destination)

  return {
    audioContext,
    cleanup: () => {
      stream.getTracks().forEach((t) => t.stop())
      audioContext.close()
    }
  }
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecordingState>('idle')
  const [sessionDir, setSessionDir] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cleanupMicRef = useRef<(() => void) | null>(null)
  const cleanupSystemRef = useRef<(() => void) | null>(null)
  const analyserRef: RefObject<AnalyserNode | null> = useRef<AnalyserNode | null>(null)

  const startRecording = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      // 1. Create timestamped session directory
      const dir = await window.api.session.create()
      setSessionDir(dir)

      // 2. Capture microphone (standard getUserMedia)
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      // 3. Capture system audio via getUserMedia with desktop source
      const sourceId = await window.api.recording.getScreenSource()
      const desktopConstraints = {
        audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } },
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } }
      } as unknown as MediaStreamConstraints
      const systemStream = await navigator.mediaDevices.getUserMedia(desktopConstraints)
      systemStream.getVideoTracks().forEach((t) => t.stop())

      // 4. Wire both streams through PCM AudioWorklets
      const mic = await createPcmCapture(micStream, 16000, (chunk) => {
        window.api.recording.sendMicAudioChunk(chunk)
      })
      cleanupMicRef.current = mic.cleanup

      // Tap the mic stream with a separate source node for the waveform visualiser
      const analyser = mic.audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.8
      mic.audioContext.createMediaStreamSource(micStream).connect(analyser)
      analyserRef.current = analyser

      // Use the native AudioContext sample rate for system audio
      const nativeCtx = new AudioContext()
      const systemSampleRate = nativeCtx.sampleRate
      nativeCtx.close()

      const system = await createPcmCapture(systemStream, systemSampleRate, (chunk) => {
        window.api.recording.sendSystemAudioChunk(chunk)
      })

      // Also tap system audio into the same analyser so the waveform reflects screen audio too
      mic.audioContext.createMediaStreamSource(systemStream).connect(analyser)
      cleanupSystemRef.current = system.cleanup

      // 5. Open WAV files in main process
      await window.api.recording.start({
        sessionDir: dir,
        micSampleRate: mic.audioContext.sampleRate,
        systemSampleRate: system.audioContext.sampleRate
      })

      setState('recording')
    } catch (err) {
      cleanupMicRef.current?.()
      cleanupSystemRef.current?.()
      cleanupMicRef.current = null
      cleanupSystemRef.current = null
      analyserRef.current = null
      setError(err instanceof Error ? err.message : 'Recording failed to start')
      setState('idle')
    }
  }, [])

  const stopRecording = useCallback(async (elapsed: number): Promise<void> => {
    setState('stopping')
    try {
      // Stop both audio streams (no more chunks will be sent after this)
      cleanupMicRef.current?.()
      cleanupSystemRef.current?.()
      cleanupMicRef.current = null
      cleanupSystemRef.current = null
      analyserRef.current = null

      // Flush and close WAV files in main process; pass duration for session metadata
      await window.api.recording.stop(elapsed)

      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed to stop')
      setState('idle')
    }
  }, [])

  return { state, sessionDir, error, analyserRef, startRecording, stopRecording }
}
