import { useRef, useState, useCallback, type RefObject } from 'react'

export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping'

export interface UseRecorderResult {
  state: RecordingState
  sessionDir: string | null
  error: string | null
  micAnalyserRef: React.RefObject<AnalyserNode | null>
  systemAnalyserRef: React.RefObject<AnalyserNode | null>
  analyserVersion: number
  startRecording: () => Promise<void>
  stopRecording: (elapsed: number) => Promise<void>
}

function getRecorderMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm']
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ''
}

async function createAnalyser(stream: MediaStream): Promise<{
  analyser: AnalyserNode
  cleanup: () => void
  audioContext: AudioContext
}> {
  const audioContext = new AudioContext()
  // AudioContext may start suspended when created deep in an async chain past the
  // user-gesture boundary. Resume it before connecting the stream source, otherwise
  // the analyser process() loop never fires and the level meters stay silent.
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.8
  const silencer = audioContext.createGain()
  silencer.gain.value = 0
  source.connect(analyser)
  analyser.connect(silencer)
  silencer.connect(audioContext.destination)

  return {
    analyser,
    audioContext,
    cleanup: () => {
      source.disconnect()
      analyser.disconnect()
      silencer.disconnect()
      void audioContext.close()
    }
  }
}

function createStreamRecorder(
  stream: MediaStream,
  onChunk: (chunk: Uint8Array) => void
): { recorder: MediaRecorder; stop: () => Promise<void> } {
  const mimeType = getRecorderMimeType()
  const recorder =
    mimeType.length > 0 ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

  recorder.addEventListener('dataavailable', async (event) => {
    if (!event.data || event.data.size === 0) return
    const buffer = await event.data.arrayBuffer()
    onChunk(new Uint8Array(buffer))
  })

  recorder.start(250)

  return {
    recorder,
    stop: () =>
      new Promise<void>((resolve) => {
        if (recorder.state === 'inactive') {
          resolve()
          return
        }

        recorder.addEventListener(
          'stop',
          () => {
            resolve()
          },
          { once: true }
        )
        recorder.stop()
      })
  }
}

function isVirtualInput(device: MediaDeviceInfo): boolean {
  return /blackhole|loopback|soundflower|zoom|display audio|vb-cable|aggregate/i.test(device.label)
}

function isPreferredPhysicalMic(device: MediaDeviceInfo): boolean {
  return /macbook.*microphone|built-in.*microphone|built-in input|internal microphone|external microphone/i.test(
    device.label
  )
}

async function getPreferredMicStream(): Promise<{
  stream: MediaStream
}> {
  // Use minimal constraints — disabling echoCancellation/noiseSuppression/autoGainControl
  // causes Chromium on macOS to route mic audio through a different processing path that
  // makes MediaRecorder produce empty blobs.
  const initialStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

  const currentTrack = initialStream.getAudioTracks()[0]
  const currentSettings = currentTrack?.getSettings()
  const devices = await navigator.mediaDevices.enumerateDevices()
  const audioInputs = devices.filter((device) => device.kind === 'audioinput')
  const concreteInputs = audioInputs.filter((device) => device.deviceId !== 'default')
  const preferredDevice =
    concreteInputs.find((device) => isPreferredPhysicalMic(device) && !isVirtualInput(device)) ??
    concreteInputs.find((device) => !isVirtualInput(device)) ??
    audioInputs.find((device) => isPreferredPhysicalMic(device) && !isVirtualInput(device)) ??
    null

  if (!preferredDevice) {
    return { stream: initialStream }
  }

  if (currentSettings.deviceId === preferredDevice.deviceId) {
    return { stream: initialStream }
  }

  const preferredStream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: preferredDevice.deviceId } },
    video: false
  })

  initialStream.getTracks().forEach((track) => track.stop())
  return { stream: preferredStream }
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecordingState>('idle')
  const [sessionDir, setSessionDir] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyserVersion, setAnalyserVersion] = useState(0)

  const cleanupMicRef = useRef<(() => void) | null>(null)
  const cleanupSystemRef = useRef<(() => void) | null>(null)
  const stopMicRecorderRef = useRef<(() => Promise<void>) | null>(null)
  const stopSystemRecorderRef = useRef<(() => Promise<void>) | null>(null)
  const micAnalyserRef: RefObject<AnalyserNode | null> = useRef<AnalyserNode | null>(null)
  const systemAnalyserRef: RefObject<AnalyserNode | null> = useRef<AnalyserNode | null>(null)
  const startTokenRef = useRef(0)

  const startRecording = useCallback(async (): Promise<void> => {
    const startToken = startTokenRef.current + 1
    startTokenRef.current = startToken
    setError(null)
    setState('starting') // show recording screen immediately; prevents double-click
    try {
      // 1. Create timestamped session directory
      const dir = await window.api.session.create()
      setSessionDir(dir)

      // 2. Capture microphone immediately and let system audio attach in the background.
      const micStreamPromise = getPreferredMicStream()

      // System audio capture: get a desktop source then getUserMedia with it.
      // This can fail if screen recording permission is not available — that's OK;
      // we fall back to mic-only recording rather than blocking the whole session.
      const systemStreamPromise = window.api.recording
        .getScreenSource()
        .then((sourceId) => {
          const constraints = {
            audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } },
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } }
          } as unknown as MediaStreamConstraints
          return navigator.mediaDevices.getUserMedia(constraints)
        })
        .then((stream) => {
          stream.getVideoTracks().forEach((t) => t.stop())
          return stream
        })
        .catch(() => null) // system audio is best-effort

      const { stream: micStream } = await micStreamPromise
      if (startTokenRef.current !== startToken) {
        micStream.getTracks().forEach((track) => track.stop())
        return
      }

      // 3. Open the output file before the first chunk is emitted.
      await window.api.recording.start({ sessionDir: dir, hasSystemAudio: false })
      if (startTokenRef.current !== startToken) {
        micStream.getTracks().forEach((track) => track.stop())
        await window.api.recording.stop(0)
        return
      }

      // 4. Bring the mic online first so the UI can transition to live recording quickly.
      const micRecorder = createStreamRecorder(micStream, (chunk) => {
        window.api.recording.sendMicAudioChunk(chunk)
      })
      const micAnalyserHandle = await createAnalyser(micStream)
      if (startTokenRef.current !== startToken) {
        await micRecorder.stop()
        micAnalyserHandle.cleanup()
        micStream.getTracks().forEach((track) => track.stop())
        await window.api.recording.stop(0)
        return
      }
      stopMicRecorderRef.current = micRecorder.stop
      cleanupMicRef.current = () => {
        void micRecorder.stop()
        micAnalyserHandle.cleanup()
        micStream.getTracks().forEach((track) => track.stop())
      }
      micAnalyserRef.current = micAnalyserHandle.analyser
      systemAnalyserRef.current = null
      setAnalyserVersion((v) => v + 1)

      setState('recording')

      // Attach system audio once it is available. This must not block recording start.
      void systemStreamPromise
        .then(async (systemStream) => {
          if (!systemStream) return
          if (startTokenRef.current !== startToken) {
            systemStream.getTracks().forEach((track) => track.stop())
            return
          }

          await window.api.recording.updateSystemAudioAvailability(true)

          const systemRecorder = createStreamRecorder(systemStream, (chunk) => {
            window.api.recording.sendSystemAudioChunk(chunk)
          })
          const systemAnalyserHandle = await createAnalyser(systemStream)

          if (startTokenRef.current !== startToken) {
            await systemRecorder.stop()
            systemAnalyserHandle.cleanup()
            systemStream.getTracks().forEach((track) => track.stop())
            return
          }

          stopSystemRecorderRef.current = systemRecorder.stop
          cleanupSystemRef.current = () => {
            void systemRecorder.stop()
            systemAnalyserHandle.cleanup()
            systemStream.getTracks().forEach((track) => track.stop())
          }
          systemAnalyserRef.current = systemAnalyserHandle.analyser
          setAnalyserVersion((v) => v + 1)
        })
        .catch((attachErr: unknown) => {
          console.warn('System audio capture unavailable, continuing with mic only', attachErr)
        })
    } catch (err) {
      startTokenRef.current += 1
      cleanupMicRef.current?.()
      cleanupSystemRef.current?.()
      cleanupMicRef.current = null
      cleanupSystemRef.current = null
      stopMicRecorderRef.current = null
      stopSystemRecorderRef.current = null
      micAnalyserRef.current = null
      systemAnalyserRef.current = null
      setAnalyserVersion((v) => v + 1)
      setError(err instanceof Error ? err.message : 'Recording failed to start')
      setState('idle')
    }
  }, [])

  const stopRecording = useCallback(async (elapsed: number): Promise<void> => {
    startTokenRef.current += 1
    setState('stopping')
    try {
      const stopMicRecorder = stopMicRecorderRef.current
      const stopSystemRecorder = stopSystemRecorderRef.current
      await Promise.all([stopMicRecorder?.(), stopSystemRecorder?.()])

      // Stop both audio streams after the recorder has flushed the final chunks.
      cleanupMicRef.current?.()
      cleanupSystemRef.current?.()
      cleanupMicRef.current = null
      cleanupSystemRef.current = null
      stopMicRecorderRef.current = null
      stopSystemRecorderRef.current = null
      micAnalyserRef.current = null
      systemAnalyserRef.current = null
      setAnalyserVersion((v) => v + 1)

      // Flush and close WAV files in main process; pass duration for session metadata
      await window.api.recording.stop(elapsed)

      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed to stop')
      setState('idle')
    }
  }, [])

  return {
    state,
    sessionDir,
    error,
    micAnalyserRef,
    systemAnalyserRef,
    analyserVersion,
    startRecording,
    stopRecording
  }
}
