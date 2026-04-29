import { ipcMain, systemPreferences, shell, desktopCapturer } from 'electron'

export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

export interface PermissionsState {
  microphone: PermissionStatus
  screen: PermissionStatus
}

export function registerPermissionHandlers(): void {
  // Check current status of both permissions — never triggers a dialog.
  // AUDIST_TEST_PERMISSIONS env var can override the result for E2E tests:
  //   'granted'        → both granted (default test bypass)
  //   'not-determined' → both not-determined (test the permissions page UI)
  //   'denied'         → both denied (test the blocked/error state)
  // On non-macOS, permissions are implicitly granted.
  ipcMain.handle('audist:permissions:check', async (): Promise<PermissionsState> => {
    const testOverride = process.env['AUDIST_TEST_PERMISSIONS']
    if (testOverride === 'granted') return { microphone: 'granted', screen: 'granted' }
    if (testOverride === 'not-determined') {
      return { microphone: 'not-determined', screen: 'not-determined' }
    }
    if (testOverride === 'denied') return { microphone: 'denied', screen: 'denied' }

    if (process.platform !== 'darwin') {
      return { microphone: 'granted', screen: 'granted' }
    }

    const microphone = systemPreferences.getMediaAccessStatus('microphone') as PermissionStatus
    let screen = systemPreferences.getMediaAccessStatus('screen') as PermissionStatus

    // On macOS 15+ Sequoia, getMediaAccessStatus('screen') is unreliable —
    // it returns 'denied' even when the user has granted access in System Settings.
    // Probe with desktopCapturer.getSources() to verify the actual state.
    if (screen !== 'granted') {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 }
        })
        if (sources.length > 0) screen = 'granted'
      } catch {
        // Keep original status
      }
    }

    return { microphone, screen }
  })

  // Trigger the macOS microphone permission dialog.
  // Returns true if granted after the dialog (or if already granted).
  ipcMain.handle('audist:permissions:request-mic', async (): Promise<boolean> => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.askForMediaAccess('microphone')
  })

  // Open the relevant System Settings Privacy pane.
  // On macOS, deep-links to the appropriate System Settings section.
  // On Linux (and other non-macOS platforms), deep-linking is not supported —
  // returns { supported: false } so the renderer can show inline guidance instead.
  ipcMain.handle(
    'audist:permissions:open-settings',
    (_, target: 'microphone' | 'screen'): { supported: boolean } => {
      if (process.platform !== 'darwin') {
        return { supported: false }
      }
      const urls: Record<string, string> = {
        microphone:
          'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
        screen:
          'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      }
      shell.openExternal(urls[target])
      return { supported: true }
    }
  )
}
