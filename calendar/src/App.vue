<script setup>
import { ref, computed, onMounted } from 'vue'
import Calendar from './components/Calendar.vue'
import TaskList from './components/TaskList.vue'
import Kanban from './components/Kanban.vue'
import Conversations from './components/Conversations.vue'
import Nest from './components/Nest.vue'
import SessionStatus from './components/SessionStatus.vue'
import Search from './components/Search.vue'
import Documents from './components/Documents.vue'
import DocumentViewer from './components/DocumentViewer.vue'
import TaskDetail from './components/TaskDetail.vue'

const currentView = ref('calendar')  // 'calendar' | 'conversations' | 'search'
const docViewerPath = ref(null)
const showDocViewer = ref(false)
const selectedTask = ref(null)
const showTaskDetail = ref(false)
const currentDate = ref(new Date())
const tasks = ref([])
const events = ref([])
const projects = ref([])
const nest = ref([])
const selectedProject = ref('all')
const showAddTask = ref(false)
const loading = ref(true)
const boardProject = ref(null)  // When set, shows kanban for that project
const selectedSessionId = ref(null)  // For navigating to specific conversation
const searchHighlight = ref(null)  // Text to highlight/scroll to in conversation

// Load data from API
const loadData = async () => {
  try {
    const res = await fetch('/api/data')
    const data = await res.json()
    tasks.value = data.tasks || []
    events.value = data.events || []
    projects.value = data.projects || []
    nest.value = data.nest || []
  } catch (err) {
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
}

// Save all data to API
const saveData = async () => {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nest: nest.value,
        projects: projects.value,
        tasks: tasks.value,
        events: events.value
      })
    })
  } catch (err) {
    console.error('Failed to save:', err)
  }
}

onMounted(loadData)

// New task form
const newTask = ref({
  title: '',
  project: 'personal',
  dueDate: '',
  notes: '',
  status: 'todo',
  remind: false
})

const filteredTasks = computed(() => {
  if (selectedProject.value === 'all') return tasks.value
  return tasks.value.filter(t => t.project === selectedProject.value)
})

const boardTasks = computed(() => {
  if (!boardProject.value) return []
  return tasks.value.filter(t => t.project === boardProject.value.id)
})

const getProjectColor = (projectId) => {
  const project = projects.value.find(p => p.id === projectId)
  return project?.color || '#888'
}

const getProjectEmoji = (projectId) => {
  const project = projects.value.find(p => p.id === projectId)
  return project?.emoji || '📌'
}

const updateTaskStatus = async (taskId, newStatus) => {
  const task = tasks.value.find(t => t.id === taskId)
  if (task) {
    task.status = newStatus
    await saveData()
  }
}

const addTask = async () => {
  if (!newTask.value.title.trim()) return
  
  const task = {
    id: Date.now(),
    title: newTask.value.title,
    project: newTask.value.project,
    dueDate: newTask.value.dueDate || null,
    status: newTask.value.status,
    notes: newTask.value.notes || null,
    remind: newTask.value.remind
  }
  
  tasks.value.push(task)
  await saveData()
  
  // Reset form
  newTask.value = {
    title: '',
    project: 'personal',
    dueDate: '',
    notes: '',
    status: 'todo',
    remind: false
  }
  showAddTask.value = false
}

const deleteTask = async (taskId) => {
  const index = tasks.value.findIndex(t => t.id === taskId)
  if (index > -1) {
    tasks.value.splice(index, 1)
    await saveData()
  }
}

const addTaskFromBoard = async (taskData) => {
  const task = {
    id: Date.now(),
    ...taskData
  }
  tasks.value.push(task)
  await saveData()
}

const openBoard = (projectId) => {
  const project = projects.value.find(p => p.id === projectId)
  if (project) {
    boardProject.value = project
  }
}

const closeBoard = () => {
  boardProject.value = null
}

// Navigate to specific session from search
const openSession = (sessionId, highlight = null) => {
  selectedSessionId.value = sessionId
  searchHighlight.value = highlight
  currentView.value = 'conversations'
  boardProject.value = null
}

// Nest functions
const addNestItem = async (text) => {
  nest.value.push({
    id: Date.now(),
    text,
    created: new Date().toISOString()
  })
  await saveData()
}

const completeNestItem = async (id) => {
  const idx = nest.value.findIndex(n => n.id === id)
  if (idx > -1) {
    nest.value.splice(idx, 1)
    await saveData()
  }
}

const removeNestItem = async (id) => {
  const idx = nest.value.findIndex(n => n.id === id)
  if (idx > -1) {
    nest.value.splice(idx, 1)
    await saveData()
  }
}

const editNestItem = async (id, newText) => {
  const idx = nest.value.findIndex(n => n.id === id)
  if (idx > -1) {
    nest.value[idx].text = newText
    await saveData()
  }
}

const promoteNestItem = async (item) => {
  // Create a task from nest item
  tasks.value.push({
    id: Date.now(),
    title: item.text,
    project: 'personal',
    dueDate: null,
    status: 'todo',
    notes: 'Promoted from The Nest',
    remind: false
  })
  // Remove from nest
  const idx = nest.value.findIndex(n => n.id === item.id)
  if (idx > -1) {
    nest.value.splice(idx, 1)
  }
  await saveData()
}

const demoteToNest = async (task) => {
  // Add to nest
  nest.value.push({
    id: Date.now(),
    text: task.title,
    created: new Date().toISOString()
  })
  // Remove from tasks
  const idx = tasks.value.findIndex(t => t.id === task.id)
  if (idx > -1) {
    tasks.value.splice(idx, 1)
  }
  await saveData()
}

// Document viewer functions
const openDocument = (path) => {
  docViewerPath.value = path
  showDocViewer.value = true
}

const closeDocViewer = () => {
  showDocViewer.value = false
  docViewerPath.value = null
}

const createNewDocument = async (path, fileType = 'md') => {
  // Create empty document and open for editing
  try {
    const filename = path.split('/').pop()
    const name = filename.replace(/\.(md|html?)$/, '')
    
    let content
    if (fileType === 'html' || filename.endsWith('.html')) {
      content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  
</body>
</html>`
    } else {
      content = `# ${name}\n\n`
    }
    
    await fetch(`/api/docs?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    openDocument(path)
  } catch (err) {
    console.error('Failed to create document:', err)
  }
}

// View nest answer
const viewNestAnswer = (answerFile) => {
  openDocument(answerFile)
}

// Task detail functions
const openTaskDetail = (task) => {
  selectedTask.value = task
  showTaskDetail.value = true
}

const closeTaskDetail = () => {
  showTaskDetail.value = false
  selectedTask.value = null
}

const saveTask = async (updatedTask) => {
  const index = tasks.value.findIndex(t => t.id === updatedTask.id)
  if (index > -1) {
    tasks.value[index] = { ...updatedTask }
    await saveData()
    // Update the selected task ref to show changes
    selectedTask.value = { ...updatedTask }
  }
}

const deleteTaskFromDetail = async (taskId) => {
  await deleteTask(taskId)
  closeTaskDetail()
}

// Update task date (from calendar drag-drop)
const updateTaskDate = async (taskId, newDate) => {
  const task = tasks.value.find(t => t.id === taskId)
  if (task) {
    task.dueDate = newDate
    await saveData()
  }
}

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const prevMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1)
}

const goToToday = () => {
  currentDate.value = new Date()
}
</script>

<template>
  <div class="app">
    <!-- Top Navigation -->
    <nav class="top-nav">
      <div class="nav-brand">
        <span class="brand-icon">🦉</span>
        <span class="brand-text">Mission Control</span>
      </div>
      <div class="nav-tabs">
        <button 
          :class="{ active: currentView === 'calendar' && !boardProject }"
          @click="currentView = 'calendar'; boardProject = null"
        >📅 Calendar</button>
        <button 
          :class="{ active: currentView === 'conversations' }"
          @click="currentView = 'conversations'; boardProject = null; selectedSessionId = null"
        >📜 Conversations</button>
        <button 
          :class="{ active: currentView === 'search' }"
          @click="currentView = 'search'; boardProject = null"
        >🔍 Search</button>
      </div>
      <SessionStatus />
    </nav>

    <!-- Kanban Board View -->
    <template v-if="boardProject">
      <div class="board-view">
        <Kanban 
          :tasks="boardTasks"
          :project="boardProject"
          :getProjectColor="getProjectColor"
          :getProjectEmoji="getProjectEmoji"
          @updateStatus="updateTaskStatus"
          @deleteTask="deleteTask"
          @addTask="addTaskFromBoard"
          @back="closeBoard"
        />
      </div>
    </template>

    <!-- Search View -->
    <template v-else-if="currentView === 'search'">
      <div class="search-view">
        <Search 
          :tasks="tasks"
          :events="events"
          :projects="projects"
          :getProjectColor="getProjectColor"
          :getProjectEmoji="getProjectEmoji"
          @openSession="openSession"
          @openProject="openBoard"
        />
      </div>
    </template>

    <!-- Conversations View -->
    <template v-else-if="currentView === 'conversations'">
      <div class="conversations-view">
        <Conversations :initialSessionId="selectedSessionId" :highlightText="searchHighlight" />
      </div>
    </template>

    <!-- Calendar View -->
    <template v-else>
      <!-- The Nest -->
      <Nest 
        :items="nest"
        @add="addNestItem"
        @complete="completeNestItem"
        @remove="removeNestItem"
        @edit="editNestItem"
        @promote="promoteNestItem"
        @viewAnswer="viewNestAnswer"
      />
      
      <header class="header">
        <div class="header-left">
          <select v-model="selectedProject" class="project-filter">
            <option value="all">All Projects</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">
              {{ p.emoji }} {{ p.name }}
            </option>
          </select>
          <button @click="showAddTask = true" class="add-btn">+ Add Task</button>
        </div>
        <div class="nav-controls">
          <button @click="prevMonth" class="nav-btn">←</button>
          <button @click="goToToday" class="today-btn">Today</button>
          <span class="current-month">{{ currentMonthYear }}</span>
          <button @click="nextMonth" class="nav-btn">→</button>
        </div>
      </header>

      <main class="main">
        <div v-if="loading" class="loading">Loading...</div>
        <template v-else>
          <div class="calendar-section">
            <Calendar 
              :currentDate="currentDate" 
              :events="events" 
              :tasks="tasks"
              :projects="projects"
              :getProjectColor="getProjectColor"
              @openTask="openTaskDetail"
              @updateTaskDate="updateTaskDate"
            />
          </div>
          
          <aside class="sidebar">
            <!-- Project Boards -->
            <div class="project-boards">
              <h3>📊 Project Boards</h3>
              <div class="board-list">
                <button 
                  v-for="p in projects" 
                  :key="p.id" 
                  class="board-btn"
                  :style="{ borderLeftColor: p.color }"
                  @click="openBoard(p.id)"
                >
                  <span class="board-emoji">{{ p.emoji }}</span>
                  <span class="board-name">{{ p.name }}</span>
                  <span class="board-count">{{ tasks.filter(t => t.project === p.id).length }}</span>
                </button>
              </div>
            </div>

            <TaskList 
              :tasks="filteredTasks" 
              :projects="projects"
              :getProjectColor="getProjectColor"
              :getProjectEmoji="getProjectEmoji"
              @updateStatus="updateTaskStatus"
              @deleteTask="deleteTask"
              @demoteToNest="demoteToNest"
            />

            <Documents 
              @openDoc="openDocument"
              @newDoc="createNewDocument"
            />
          </aside>
        </template>
      </main>
    </template>

    <!-- Document Viewer -->
    <DocumentViewer 
      :path="docViewerPath"
      :visible="showDocViewer"
      @close="closeDocViewer"
    />

    <!-- Task Detail Panel -->
    <TaskDetail
      :task="selectedTask"
      :visible="showTaskDetail"
      :projects="projects"
      :getProjectColor="getProjectColor"
      :getProjectEmoji="getProjectEmoji"
      @close="closeTaskDetail"
      @save="saveTask"
      @delete="deleteTaskFromDetail"
      @openBoard="(projectId) => { closeTaskDetail(); openBoard(projectId) }"
    />

    <!-- Add Task Modal -->
    <div v-if="showAddTask" class="modal-overlay" @click.self="showAddTask = false">
      <div class="modal">
        <h2>Add New Task</h2>
        
        <div class="form-group">
          <label>Title</label>
          <input 
            v-model="newTask.title" 
            type="text" 
            placeholder="What needs to be done?"
            @keyup.enter="addTask"
            autofocus
          />
        </div>

        <div class="form-group">
          <label>Project</label>
          <select v-model="newTask.project">
            <option v-for="p in projects" :key="p.id" :value="p.id">
              {{ p.emoji }} {{ p.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Due Date (optional)</label>
          <input v-model="newTask.dueDate" type="date" />
        </div>

        <div class="form-group">
          <label>Status</label>
          <select v-model="newTask.status">
            <option value="todo">📋 To Do</option>
            <option value="in-progress">🔄 In Progress</option>
            <option value="blocked">🚫 Blocked</option>
          </select>
        </div>

        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea 
            v-model="newTask.notes" 
            placeholder="Additional details..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newTask.remind" />
            <span class="checkbox-text">🦉 George, remind me on Telegram</span>
          </label>
        </div>

        <div class="modal-actions">
          <button @click="showAddTask = false" class="cancel-btn">Cancel</button>
          <button @click="addTask" class="save-btn">Add Task</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
}

/* Top Navigation */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #e2e8f0;
}

.nav-tabs {
  display: flex;
  gap: 0.5rem;
}

.nav-tabs button {
  background: transparent;
  color: #94a3b8;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s, color 0.2s;
}

.nav-tabs button:hover {
  background: #1e293b;
  color: #e2e8f0;
}

.nav-tabs button.active {
  background: #1e293b;
  color: #e2e8f0;
}

.conversations-view,
.search-view {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}

.board-view {
  padding: 1.5rem 2rem;
  max-width: 1600px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.project-filter {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.add-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #059669;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-btn, .today-btn {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.nav-btn:hover, .today-btn:hover {
  background: #475569;
}

.current-month {
  font-size: 1.1rem;
  font-weight: 500;
  min-width: 180px;
  text-align: center;
}

.main {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  max-width: 1600px;
  margin: 0 auto;
  height: calc(100vh - 120px);
  align-items: start;
}

.loading {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem;
  color: #64748b;
  font-size: 1.2rem;
}

.calendar-section {
  background: #1e293b;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #334155;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

/* Project Boards Section */
.project-boards {
  background: #1e293b;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #334155;
}

.project-boards h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.board-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.board-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  background: #0f172a;
  border: none;
  border-left: 3px solid;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  text-align: left;
  color: #e2e8f0;
}

.board-btn:hover {
  background: #1a2744;
  transform: translateX(4px);
}

.board-emoji {
  font-size: 1.2rem;
}

.board-name {
  flex: 1;
  font-size: 0.9rem;
}

.board-count {
  background: #334155;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #1e293b;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  border: 1px solid #334155;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.3rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  background: #0f172a;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group textarea {
  resize: vertical;
}

.checkbox-group {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  background: #0f172a;
  border-radius: 6px;
  border: 1px solid #475569;
  transition: border-color 0.2s;
}

.checkbox-label:hover {
  border-color: #6366f1;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #6366f1;
  cursor: pointer;
}

.checkbox-text {
  font-size: 0.95rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-btn, .save-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
}

.cancel-btn:hover {
  background: #475569;
}

.save-btn {
  background: #3b82f6;
  color: white;
  border: none;
}

.save-btn:hover {
  background: #2563eb;
}

/* Tablet */
@media (max-width: 1024px) {
  .main {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  
  .sidebar {
    order: -1;
    max-height: none;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .top-nav {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }
  
  .nav-brand {
    width: 100%;
    justify-content: center;
  }
  
  .nav-tabs {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .nav-tabs button {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .header-left {
    width: 100%;
    justify-content: space-between;
  }
  
  .nav-controls {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .current-month {
    min-width: auto;
    font-size: 1rem;
  }
  
  .main {
    padding: 0.75rem;
    height: auto;
    min-height: calc(100vh - 180px);
  }
  
  .calendar-section {
    padding: 1rem;
  }
  
  .sidebar {
    gap: 1rem;
  }
  
  .project-boards h3 {
    font-size: 0.9rem;
  }
  
  .board-btn {
    padding: 0.6rem;
  }
  
  .board-name {
    font-size: 0.85rem;
  }
  
  .conversations-view,
  .search-view,
  .board-view {
    padding: 1rem;
  }
  
  .modal {
    width: 95%;
    max-width: none;
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .modal h2 {
    font-size: 1.1rem;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .brand-text {
    font-size: 1rem;
  }
  
  .nav-tabs button {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
  
  .add-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .project-filter {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .nav-btn, .today-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
}
</style>
