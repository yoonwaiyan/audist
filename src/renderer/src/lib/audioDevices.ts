/**
 * Returns true if at least one audio input device whose label contains "monitor"
 * is present. On Linux with PulseAudio/PipeWire-pulse, a monitor source (system
 * audio loopback) appears as an audioinput with a label like "Monitor of …".
 *
 * This requires the browser to have been granted microphone permission so that
 * device labels are populated; if labels are empty the check falls back to false.
 */
export async function hasLinuxMonitorSource(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some(
      (d) => d.kind === 'audioinput' && d.label.toLowerCase().includes('monitor')
    )
  } catch {
    return false
  }
}
