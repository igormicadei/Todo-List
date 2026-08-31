import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { getMigrationsDir, loadOrCreateConfig, regenerateApiToken } from './config'
import { registerIpcHandlers } from './ipc'
import { runMigrations } from './server/migrate'
import { startServer } from './server/createServer'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app
    .whenReady()
    .then(async () => {
      const config = loadOrCreateConfig()
      runMigrations(config.dbPath, getMigrationsDir())

      const server = await startServer({
        dbPath: config.dbPath,
        apiToken: config.apiToken,
        port: config.port,
        regenerateToken: regenerateApiToken
      })

      registerIpcHandlers({
        apiBaseUrl: `http://127.0.0.1:${server.port}`,
        apiToken: config.apiToken
      })

      createWindow()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Failed to start Todo List:', error)
      dialog.showErrorBox(
        'Todo List failed to start',
        `The local server could not start (it may already be running, or its port is in use).\n\n${message}`
      )
      app.quit()
    })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
