<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  tasks: Array,
  events: Array,
  projects: Array,
  getProjectColor: Function,
  getProjectEmoji: Function
})

const emit = defineEmits(['openSession', 'openTask', 'openProject'])

const query = ref('')
const results = ref([])
const loading = ref(false)
const searchInput = ref(null)

// Debounced search
let searchTimeout = null

watch(query, (newQuery) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  
  if (!newQuery.trim()) {
    results.value = []
    return
  }
  
  searchTimeout = setTimeout(() => {
    performSearch(newQuery)
  }, 200)
})

const performSearch = async (searchQuery) => {
  loading.value = true
  const q = searchQuery.toLowerCase()
  const allResults = []
  
  // Search local tasks
  for (const task of props.tasks) {
    if (task.title.toLowerCase().includes(q) || 
        (task.notes || '').toLowerCase().includes(q)) {
      const project = props.projects.find(p => p.id === task.project)
      allResults.push({
        type: 'task',
        id: task.id,
        title: task.title,
        project: task.project,
        projectName: project?.name || 'Unknown',
        projectEmoji: project?.emoji || '📌',
        projectColor: project?.color || '#888',
        status: task.status,
        dueDate: task.dueDate,
        snippet: task.notes || '',
        matchField: task.title.toLowerCase().includes(q) ? 'title' : 'notes'
      })
    }
  }
  
  // Search local events
  for (const event of props.events) {
    if (event.title.toLowerCase().includes(q) || 
        (event.description || '').toLowerCase().includes(q)) {
      const project = props.projects.find(p => p.id === event.project)
      allResults.push({
        type: 'event',
        id: event.id,
        title: event.title,
        project: event.project,
        projectName: project?.name || 'Unknown',
        projectEmoji: project?.emoji || '📅',
        projectColor: project?.color || '#888',
        date: event.date,
        snippet: event.description || '',
        matchField: event.title.toLowerCase().includes(q) ? 'title' : 'description'
      })
    }
  }
  
  // Search conversations via API
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
    const data = await res.json()
    
    for (const result of data.results) {
      if (result.type === 'task') continue // Already searched locally
      if (result.sessionId) {
        allResults.push({
          type: 'conversation',
          sessionId: result.sessionId,
          role: result.role,
          snippet: result.snippet,
          timestamp: result.timestamp
        })
      }
    }
  } catch (err) {
    console.error('Search API error:', err)
  }
  
  results.value = allResults
  loading.value = false
}

const highlightMatch = (text, maxLen = 150) => {
  if (!text || !query.value) return text
  const q = query.value.toLowerCase()
  const lowerText = text.toLowerCase()
  const idx = lowerText.indexOf(q)
  
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '')
  
  // Show context around match
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + q.length + 60)
  let snippet = text.slice(start, end)
  
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'
  
  return snippet
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

const formatTimestamp = (ts) => {
  if (!ts) return ''
  const date = new Date(ts)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusEmoji = (status) => {
  const map = {
    'todo': '📋',
    'in-progress': '🔄',
    'blocked': '🚫',
    'done': '✅'
  }
  return map[status] || '📋'
}

const taskResults = computed(() => results.value.filter(r => r.type === 'task'))
const eventResults = computed(() => results.value.filter(r => r.type === 'event'))
const conversationResults = computed(() => results.value.filter(r => r.type === 'conversation'))

const clearSearch = () => {
  query.value = ''
  results.value = []
  searchInput.value?.focus()
}
</script>

<template>
  <div class="search">
    <div class="search-header">
      <h2>🔍 Search</h2>
    </div>
    
    <div class="search-box">
      <input 
        ref="searchInput"
        v-model="query"
        type="text"
        placeholder="Search tasks, events, and conversations..."
        class="search-input"
        autofocus
      />
      <button v-if="query" @click="clearSearch" class="clear-btn">✕</button>
    </div>
    
    <div v-if="loading" class="loading">
      <span class="spinner"></span> Searching...
    </div>
    
    <div v-else-if="query && results.length === 0" class="no-results">
      No results found for "{{ query }}"
    </div>
    
    <div v-else-if="results.length > 0" class="results">
      <!-- Tasks Section -->
      <div v-if="taskResults.length > 0" class="result-section">
        <h3>📋 Tasks ({{ taskResults.length }})</h3>
        <div class="result-list">
          <div 
            v-for="result in taskResults" 
            :key="'task-' + result.id"
            class="result-card task-card"
            :style="{ borderLeftColor: result.projectColor }"
            @click="emit('openProject', result.project)"
          >
            <div class="result-header">
              <span class="result-emoji">{{ result.projectEmoji }}</span>
              <span class="result-title">{{ result.title }}</span>
              <span class="status-badge">{{ getStatusEmoji(result.status) }}</span>
            </div>
            <div class="result-meta">
              <span class="project-tag">{{ result.projectName }}</span>
              <span v-if="result.dueDate" class="date-tag">📅 {{ formatDate(result.dueDate) }}</span>
            </div>
            <div v-if="result.snippet && result.matchField === 'notes'" class="result-snippet">
              {{ highlightMatch(result.snippet) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Events Section -->
      <div v-if="eventResults.length > 0" class="result-section">
        <h3>📅 Events ({{ eventResults.length }})</h3>
        <div class="result-list">
          <div 
            v-for="result in eventResults" 
            :key="'event-' + result.id"
            class="result-card event-card"
            :style="{ borderLeftColor: result.projectColor }"
            @click="emit('openProject', result.project)"
          >
            <div class="result-header">
              <span class="result-emoji">{{ result.projectEmoji }}</span>
              <span class="result-title">{{ result.title }}</span>
            </div>
            <div class="result-meta">
              <span class="project-tag">{{ result.projectName }}</span>
              <span v-if="result.date" class="date-tag">📅 {{ formatDate(result.date) }}</span>
            </div>
            <div v-if="result.snippet" class="result-snippet">
              {{ highlightMatch(result.snippet) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Conversations Section -->
      <div v-if="conversationResults.length > 0" class="result-section">
        <h3>💬 Conversations ({{ conversationResults.length }})</h3>
        <div class="result-list">
          <div 
            v-for="(result, idx) in conversationResults" 
            :key="'conv-' + idx"
            class="result-card conversation-card"
            @click="emit('openSession', result.sessionId, result.timestamp)"
          >
            <div class="result-header">
              <span class="result-emoji">{{ result.role === 'user' ? '👤' : '🦉' }}</span>
              <span class="role-label">{{ result.role === 'user' ? 'You' : 'George' }}</span>
              <span class="timestamp">{{ formatTimestamp(result.timestamp) }}</span>
            </div>
            <div class="result-snippet conversation-snippet">
              {{ highlightMatch(result.snippet, 200) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">🔎</div>
      <p>Search across your tasks, calendar events, and conversation history</p>
      <div class="search-tips">
        <div class="tip">💡 Try searching for project names, task titles, or keywords from conversations</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #334155;
}

.search-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

.search-box {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  background: #0f172a;
  color: #e2e8f0;
  border: 2px solid #334155;
  padding: 1rem 3rem 1rem 1rem;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.search-input::placeholder {
  color: #64748b;
}

.clear-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: #475569;
  color: #e2e8f0;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #64748b;
}

.loading {
  text-align: center;
  color: #64748b;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #334155;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-results {
  text-align: center;
  color: #64748b;
  padding: 3rem 1rem;
  font-size: 1rem;
}

.results {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.result-section {
  margin-bottom: 2rem;
}

.result-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #94a3b8;
  font-weight: 500;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-card {
  background: #0f172a;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  border-left: 3px solid #6366f1;
}

.result-card:hover {
  background: #1a2744;
  transform: translateX(4px);
}

.task-card, .event-card {
  /* Border color set dynamically via style binding */
}

.conversation-card {
  border-left-color: #8b5cf6;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.result-emoji {
  font-size: 1.1rem;
}

.result-title {
  flex: 1;
  font-weight: 500;
  color: #e2e8f0;
}

.role-label {
  flex: 1;
  font-weight: 500;
  color: #e2e8f0;
}

.status-badge {
  font-size: 0.9rem;
}

.timestamp {
  font-size: 0.8rem;
  color: #64748b;
}

.result-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.project-tag {
  background: #1e293b;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #94a3b8;
}

.date-tag {
  font-size: 0.8rem;
  color: #64748b;
}

.result-snippet {
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.4;
  padding-top: 0.5rem;
  border-top: 1px solid #1e293b;
}

.conversation-snippet {
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
}

.search-tips {
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
}

.tip {
  background: #1e293b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #94a3b8;
}
</style>
