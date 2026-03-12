import { createHashRouter, redirect } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import PrefsLayout from './layouts/PrefsLayout'
import SessionListPage from './pages/SessionListPage'
import SetupPage from './pages/SetupPage'
import GeneralPrefsPage from './pages/prefs/GeneralPrefsPage'
import LLMPrefsPage from './pages/prefs/LLMPrefsPage'
import PromptPrefsPage from './pages/prefs/PromptPrefsPage'

async function requireSaveDirectory(): Promise<Response | null> {
  const accessible = await window.api.directory.verify()
  if (!accessible) return redirect('/setup')
  return null
}

const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    loader: requireSaveDirectory,
    children: [{ index: true, element: <SessionListPage /> }]
  },
  {
    path: '/setup',
    element: <SetupPage />
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
