import { createHashRouter } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import PrefsLayout from './layouts/PrefsLayout'
import SessionListPage from './pages/SessionListPage'
import GeneralPrefsPage from './pages/prefs/GeneralPrefsPage'
import LLMPrefsPage from './pages/prefs/LLMPrefsPage'
import PromptPrefsPage from './pages/prefs/PromptPrefsPage'

const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [{ index: true, element: <SessionListPage /> }]
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
