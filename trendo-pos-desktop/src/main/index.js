const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const os = require('os')

let mainWindow
let ollamaProcess = null

// Función para iniciar Ollama
function startOllama() {
  return new Promise((resolve) => {
    try {
      console.log('Iniciando Ollama...')
      
      // Detectar el sistema operativo
      const isWindows = os.platform() === 'win32'
      
      if (isWindows) {
        // En Windows, ejecutar: ollama serve
        ollamaProcess = spawn('ollama', ['serve'], {
          detached: false,
          stdio: 'pipe',
          shell: true
        })
      } else {
        // En macOS/Linux
        ollamaProcess = spawn('ollama', ['serve'], {
          detached: false,
          stdio: 'pipe'
        })
      }
      
      ollamaProcess.on('error', (err) => {
        console.error('Error iniciando Ollama:', err.message)
        resolve(false)
      })
      
      // Esperar 3 segundos para que Ollama inicie
      setTimeout(() => {
        console.log('Ollama iniciado correctamente')
        resolve(true)
      }, 3000)
      
    } catch (error) {
      console.error('Error al intentar iniciar Ollama:', error)
      resolve(false)
    }
  })
}

// Función para cerrar Ollama cuando se cierra la app
function closeOllama() {
  if (ollamaProcess) {
    try {
      ollamaProcess.kill()
      console.log('Ollama cerrado')
    } catch (error) {
      console.error('Error al cerrar Ollama:', error)
    }
  }
}

// Escuchar IPC para obtener estado de Ollama
ipcMain.handle('check-ollama-status', async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags')
    return response.ok
  } catch {
    return false
  }
})

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Trendo POS',
    center: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,  // Permite peticiones a Supabase
      allowRunningInsecureContent: true
    }
  })

  // Permitir conexiones a Supabase
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: details.requestHeaders })
  })

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, PATCH, OPTIONS'],
        'Access-Control-Allow-Headers': ['*']
      }
    })
  })

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Modificar el evento app.on('ready')
app.on('ready', async () => {
  // Iniciar Ollama primero
  const ollamaStarted = await startOllama()
  
  console.log('Ollama iniciado:', ollamaStarted)
  
  // Luego crear la ventana
  createWindow()
})

// Modificar el evento app.on('window-all-closed')
app.on('window-all-closed', () => {
  closeOllama() // Cerrar Ollama antes de cerrar la app
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Optional: handle secure IPC if needed later
ipcMain.handle('app:get-env', async (_e) => {
  return {
    NODE_ENV: process.env.NODE_ENV
  }
})
