import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { homedir } from 'os'
import { createInterface } from 'readline'
import { createReadStream } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data', 'events.json')
const SESSIONS_DIR = join(homedir(), '.openclaw', 'agents', 'main', 'sessions')

const app = express()
app.use(cors())
app.use(express.json())

// GET all data
app.get('/api/data', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data' })
  }
})

// SAVE all data
app.post('/api/data', (req, res) => {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2))
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data' })
  }
})

// Add a single task (convenience endpoint)
app.post('/api/tasks', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
    const newTask = {
      id: Date.now(),
      ...req.body,
      status: req.body.status || 'todo'
    }
    data.tasks.push(newTask)
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
    res.json(newTask)
  } catch (err) {
    res.status(500).json({ error: 'Failed to add task' })
  }
})

// Update task status
app.patch('/api/tasks/:id', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
    const task = data.tasks.find(t => t.id === parseInt(req.params.id))
    if (task) {
      Object.assign(task, req.body)
      writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
      res.json(task)
    } else {
      res.status(404).json({ error: 'Task not found' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
    const index = data.tasks.findIndex(t => t.id === parseInt(req.params.id))
    if (index > -1) {
      data.tasks.splice(index, 1)
      writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
      res.json({ success: true })
    } else {
      res.status(404).json({ error: 'Task not found' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// ============ OPENCLAW STATUS ============

// Get OpenClaw session status (from cached file)
app.get('/api/openclaw/status', async (req, res) => {
  try {
    const statusFile = join(__dirname, 'data', 'openclaw-status.json')
    const data = JSON.parse(readFileSync(statusFile, 'utf-8'))
    res.json(data)
  } catch (err) {
    // Return fallback if file doesn't exist
    res.json({ 
      model: 'unknown', 
      contextSize: 0, 
      contextWindow: 1000000,
      cost: { total: 0 }
    })
  }
})

// ============ SESSIONS / CONVERSATIONS ============

// List all sessions
app.get('/api/sessions', (req, res) => {
  try {
    const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'))
    const sessions = files.map(file => {
      const filePath = join(SESSIONS_DIR, file)
      const stats = statSync(filePath)
      const id = file.replace('.jsonl', '')
      
      // Read first and last line for metadata
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.trim().split('\n').filter(l => l)
      
      let firstUserMessage = null
      let messageCount = 0
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          if (entry.type !== 'message') continue
          messageCount++
          const msg = entry.message
          if (!firstUserMessage && msg?.role === 'user' && msg?.content) {
            const text = typeof msg.content === 'string' 
              ? msg.content 
              : msg.content.find(c => c.type === 'text')?.text || ''
            // Skip system prompts, get real user messages
            if (text && !text.startsWith('A new session was started')) {
              firstUserMessage = text.slice(0, 100)
            }
          }
        } catch (e) {}
      }
      
      return {
        id,
        file,
        updatedAt: stats.mtime,
        size: stats.size,
        messageCount,
        preview: firstUserMessage || '(no preview)'
      }
    })
    
    // Sort by most recent
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: 'Failed to list sessions', details: err.message })
  }
})

// Get single session transcript
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const filePath = join(SESSIONS_DIR, `${req.params.id}.jsonl`)
    const content = readFileSync(filePath, 'utf-8')
    const messages = content
      .trim()
      .split('\n')
      .filter(l => l)
      .map(line => {
        try {
          const entry = JSON.parse(line)
          // Only return actual messages, extract the message object
          if (entry.type === 'message' && entry.message) {
            return {
              role: entry.message.role,
              content: entry.message.content,
              timestamp: entry.timestamp
            }
          }
          return null
        } catch (e) {
          return null
        }
      })
      .filter(m => m !== null)
    
    res.json({ id: req.params.id, messages })
  } catch (err) {
    res.status(404).json({ error: 'Session not found' })
  }
})

// Search across sessions, tasks, and events
app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase()
  if (!query) {
    return res.json({ results: [] })
  }
  
  try {
    const results = []
    const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'))
    
    for (const file of files) {
      const filePath = join(SESSIONS_DIR, file)
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.trim().split('\n').filter(l => l)
      const sessionId = file.replace('.jsonl', '')
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          // Handle JSONL format: { type: 'message', message: {...}, timestamp: ... }
          if (entry.type !== 'message' || !entry.message) continue
          
          const msg = entry.message
          // Skip system messages and tool results
          if (msg.role === 'system' || msg.role === 'toolResult' || msg.role === 'tool') continue
          
          const text = typeof msg.content === 'string'
            ? msg.content
            : (msg.content || []).filter(c => c.type === 'text').map(c => c.text).join(' ')
          
          if (text && text.toLowerCase().includes(query)) {
            results.push({
              sessionId,
              role: msg.role,
              snippet: text.slice(0, 300),
              timestamp: entry.timestamp
            })
          }
        } catch (e) {}
      }
    }
    
    // Also search tasks and events
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
    
    for (const task of data.tasks || []) {
      if (task.title.toLowerCase().includes(query) || 
          (task.notes || '').toLowerCase().includes(query)) {
        results.push({
          type: 'task',
          id: task.id,
          title: task.title,
          project: task.project,
          status: task.status,
          dueDate: task.dueDate,
          snippet: task.notes || ''
        })
      }
    }
    
    for (const event of data.events || []) {
      if (event.title.toLowerCase().includes(query) || 
          (event.description || '').toLowerCase().includes(query)) {
        results.push({
          type: 'event',
          id: event.id,
          title: event.title,
          project: event.project,
          date: event.date,
          snippet: event.description || ''
        })
      }
    }
    
    res.json({ query, results: results.slice(0, 100) })
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message })
  }
})

// ============ DOCUMENTS ============

const WORKSPACE_DIR = join(homedir(), '.openclaw', 'workspace')
const PROJECTS_DIR = join(WORKSPACE_DIR, 'projects')
const NEST_DIR = join(WORKSPACE_DIR, 'nest')

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.query.folder
    if (!uploadPath) {
      return cb(new Error('No folder specified'))
    }
    const fullPath = join(WORKSPACE_DIR, uploadPath)
    
    // Security check
    if (!fullPath.startsWith(WORKSPACE_DIR)) {
      return cb(new Error('Invalid path'))
    }
    
    // Create folder if it doesn't exist
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true })
    }
    
    cb(null, fullPath)
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

// List all projects with their doc structure
app.get('/api/projects', (req, res) => {
  try {
    const projects = readdirSync(PROJECTS_DIR).filter(f => {
      const stat = statSync(join(PROJECTS_DIR, f))
      return stat.isDirectory()
    })
    
    const result = projects.map(name => {
      const projectPath = join(PROJECTS_DIR, name)
      const folders = ['docs', 'marketing', 'assets'].map(folder => {
        const folderPath = join(projectPath, folder)
        try {
          const files = readdirSync(folderPath).filter(f => !f.startsWith('.'))
          return { name: folder, files }
        } catch (e) {
          return { name: folder, files: [] }
        }
      })
      return { name, folders }
    })
    
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to list projects', details: err.message })
  }
})

// List files in a specific project folder
app.get('/api/projects/:project/:folder', (req, res) => {
  try {
    const folderPath = join(PROJECTS_DIR, req.params.project, req.params.folder)
    const files = readdirSync(folderPath).filter(f => !f.startsWith('.'))
    const result = files.map(file => {
      const filePath = join(folderPath, file)
      const stat = statSync(filePath)
      return {
        name: file,
        size: stat.size,
        updatedAt: stat.mtime,
        isDirectory: stat.isDirectory()
      }
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to list files', details: err.message })
  }
})

// Read a document (markdown, txt, json)
// Uses query param: /api/docs?path=projects/foo/docs/bar.md
app.get('/api/docs', (req, res) => {
  try {
    const docPath = req.query.path
    if (!docPath) {
      return res.status(400).json({ error: 'Path parameter required' })
    }
    
    const fullPath = join(WORKSPACE_DIR, docPath)
    
    // Security: ensure path stays within workspace
    if (!fullPath.startsWith(WORKSPACE_DIR)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const content = readFileSync(fullPath, 'utf-8')
    const stat = statSync(fullPath)
    
    res.json({
      path: docPath,
      content,
      size: stat.size,
      updatedAt: stat.mtime
    })
  } catch (err) {
    res.status(404).json({ error: 'Document not found', details: err.message })
  }
})

// Save a document
app.post('/api/docs', (req, res) => {
  try {
    const docPath = req.query.path || req.body.path
    if (!docPath) {
      return res.status(400).json({ error: 'Path parameter required' })
    }
    
    const fullPath = join(WORKSPACE_DIR, docPath)
    
    // Security: ensure path stays within workspace
    if (!fullPath.startsWith(WORKSPACE_DIR)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const { content } = req.body
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' })
    }
    
    writeFileSync(fullPath, content)
    res.json({ success: true, path: docPath })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save document', details: err.message })
  }
})

// Rename a document
app.post('/api/docs/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'oldPath and newPath required' })
    }
    
    const fullOldPath = join(WORKSPACE_DIR, oldPath)
    const fullNewPath = join(WORKSPACE_DIR, newPath)
    
    // Security: ensure paths stay within workspace
    if (!fullOldPath.startsWith(WORKSPACE_DIR) || !fullNewPath.startsWith(WORKSPACE_DIR)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    renameSync(fullOldPath, fullNewPath)
    res.json({ success: true, oldPath, newPath })
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename document', details: err.message })
  }
})

// Delete a document
app.delete('/api/docs', (req, res) => {
  try {
    const docPath = req.query.path
    if (!docPath) {
      return res.status(400).json({ error: 'Path parameter required' })
    }
    
    const fullPath = join(WORKSPACE_DIR, docPath)
    
    // Security: ensure path stays within workspace
    if (!fullPath.startsWith(WORKSPACE_DIR)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    unlinkSync(fullPath)
    res.json({ success: true, path: docPath })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document', details: err.message })
  }
})

// Upload file(s)
app.post('/api/upload', upload.array('files', 20), (req, res) => {
  try {
    const files = req.files.map(f => ({
      name: f.originalname,
      size: f.size,
      path: join(req.query.folder, f.originalname)
    }))
    res.json({ success: true, files })
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message })
  }
})

// Serve static files from workspace (for images)
app.get('/api/files', (req, res) => {
  const filePath = req.query.path
  if (!filePath) {
    return res.status(400).json({ error: 'Path parameter required' })
  }
  
  const fullPath = join(WORKSPACE_DIR, filePath)
  
  // Security check
  if (!fullPath.startsWith(WORKSPACE_DIR)) {
    return res.status(403).json({ error: 'Access denied' })
  }
  
  if (!existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found', path: fullPath })
  }
  
  // Determine content type
  const ext = filePath.split('.').pop().toLowerCase()
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'pdf': 'application/pdf',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'html': 'text/html',
    'json': 'application/json'
  }
  
  const contentType = mimeTypes[ext] || 'application/octet-stream'
  
  try {
    const data = readFileSync(fullPath)
    res.setHeader('Content-Type', contentType)
    res.send(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file', details: err.message })
  }
})

// List nest answers
app.get('/api/nest-docs', (req, res) => {
  try {
    const files = readdirSync(NEST_DIR).filter(f => f.endsWith('.md'))
    const result = files.map(file => {
      const filePath = join(NEST_DIR, file)
      const stat = statSync(filePath)
      const content = readFileSync(filePath, 'utf-8')
      const firstLine = content.split('\n')[0].replace(/^#\s*/, '')
      return {
        name: file,
        title: firstLine,
        size: stat.size,
        updatedAt: stat.mtime
      }
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to list nest docs', details: err.message })
  }
})

// Serve krtech website at /krtech
app.use('/krtech', express.static(join(WORKSPACE_DIR, 'projects/krtech/docs')))
app.use('/krtech/assets', express.static(join(WORKSPACE_DIR, 'projects/krtech/assets')))

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🦉 George API running at http://localhost:${PORT}`)
  console.log(`   Data file: ${DATA_FILE}`)
  console.log(`   Sessions: ${SESSIONS_DIR}`)
  console.log(`   Workspace: ${WORKSPACE_DIR}`)
})
