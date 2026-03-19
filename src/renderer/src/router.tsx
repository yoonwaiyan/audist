import { createHashRouter, redirect } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import PrefsLayout from './layouts/PrefsLayout'
import SessionListPage from './pages/SessionListPage'
import SessionDetail from './pages/SessionDetail'
import Onboarding from './pages/onboarding/Onboarding'
import PermissionsPage from './pages/PermissionsPage'
import WhisperSetupPage from './pages/WhisperSetupPage'
import GeneralPrefsPage from './pages/prefs/GeneralPrefsPage'
import LLMPrefsPage from './pages/prefs/LLMPrefsPage'
import PromptPrefsPage from './pages/prefs/PromptPrefsPage'

async function requireSetup(): Promise<Response | null> {
  // 1. Save directory must be configured and accessible
  const dirOk = await window.api.directory.verify()
  if (!dirOk) return redirect('/onboarding')

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
    element: <AppShell />,
    loader: requireSetup,
    children: [
      { index: true, element: <SessionListPage /> },
      { path: 'sessions/:id', element: <SessionDetail /> }
    ]
  },
  {
    path: '/onboarding',
    element: <Onboarding />
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
