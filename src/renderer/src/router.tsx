import { createHashRouter, redirect } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import PrefsLayout from './layouts/PrefsLayout'
import SessionListPage from './pages/SessionListPage'
import SetupPage from './pages/SetupPage'
import PermissionsPage from './pages/PermissionsPage'
import WhisperSetupPage from './pages/WhisperSetupPage'
import GeneralPrefsPage from './pages/prefs/GeneralPrefsPage'
import LLMPrefsPage from './pages/prefs/LLMPrefsPage'
import PromptPrefsPage from './pages/prefs/PromptPrefsPage'

async function requireSetup(): Promise<Response | null> {
  // 1. Save directory must be configured and accessible
  const dirOk = await window.api.directory.verify()
  if (!dirOk) return redirect('/setup')

  // 2. Both permissions must be granted
  const perms = await window.api.permissions.check()
  if (perms.microphone !== 'granted' || perms.screen !== 'granted') {
    return redirect('/permissions')
  }

  // 3. Whisper engine must be bootstrapped
  const whisperReady = await window.api.whisper.isReady()
  if (!whisperReady) return redirect('/whisper-setup')

  return null
}

const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    loader: requireSetup,
    children: [{ index: true, element: <SessionListPage /> }]
  },
  {
    path: '/setup',
    element: <SetupPage />
  },
  {
    path: '/permissions',
    element: <PermissionsPage />
  },
  {
    path: '/whisper-setup',
    element: <WhisperSetupPage />
  },
  {
    path: '/prefs',
    element: <PrefsLayout />,
    children: [
      { index: true, element: <GeneralPrefsPage /> },
      { path: 'llm', element: <LLMPrefsPage /> },
      { path: 'prompt', element: <PromptPrefsPage /> }
    ]
  }
])

export default router
