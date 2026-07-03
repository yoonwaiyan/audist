import { ipcMain, BrowserWindow } from 'electron'
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  setActiveTemplate,
  updateTemplate
} from './store'
import type { PromptTemplate } from './types'

function broadcastChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('audist:templates:changed')
  }
}

export function registerTemplateHandlers(): void {
  ipcMain.handle('audist:templates:list', (): PromptTemplate[] => listTemplates())

  ipcMain.handle(
    'audist:templates:get',
    (_, { id }: { id: string }): PromptTemplate | null => getTemplate(id)
  )

  ipcMain.handle(
    'audist:templates:create',
    (_, { template }: { template: Partial<PromptTemplate> }): PromptTemplate => {
      const created = createTemplate(template)
      broadcastChanged()
      return created
    }
  )

  ipcMain.handle(
    'audist:templates:update',
    (_, { id, changes }: { id: string; changes: Partial<PromptTemplate> }): PromptTemplate => {
      const updated = updateTemplate(id, changes)
      broadcastChanged()
      return updated
    }
  )

  ipcMain.handle(
    'audist:templates:delete',
    (_, { id }: { id: string }): { success: boolean } => {
      const result = deleteTemplate(id)
      broadcastChanged()
      return result
    }
  )

  ipcMain.handle(
    'audist:templates:duplicate',
    (_, { id, name }: { id: string; name?: string }): PromptTemplate => {
      const created = duplicateTemplate(id, name)
      broadcastChanged()
      return created
    }
  )

  ipcMain.handle(
    'audist:templates:setActive',
    (_, { id }: { id: string }): { success: boolean } => {
      const result = setActiveTemplate(id)
      broadcastChanged()
      return result
    }
  )
}
