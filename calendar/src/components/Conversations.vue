<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'

const props = defineProps({
  initialSessionId: String,
  highlightText: String
})

const sessions = ref([])
const selectedSession = ref(null)
const messages = ref([])
const loading = ref(true)
const loadingMessages = ref(false)
const highlightedIndex = ref(-1)

const emit = defineEmits(['back'])

onMounted(async () => {
  try {
    const res = await fetch('/api/sessions')
    sessions.value = await res.json()
    
    // If we have an initial session ID, load it
    if (props.initialSessionId) {
      const session = sessions.value.find(s => s.id === props.initialSessionId)
      if (session) {
        loadSession(session, props.highlightText)
      }
    }
  } catch (err) {
    console.error('Failed to load sessions:', err)
  } finally {
    loading.value = false
  }
})

// Watch for changes to initialSessionId
watch(() => props.initialSessionId, async (newId) => {
  if (newId && sessions.value.length > 0) {
    const session = sessions.value.find(s => s.id === newId)
    if (session) {
      loadSession(session, props.highlightText)
    }
  }
})

const loadSession = async (session, scrollToText = null) => {
  selectedSession.value = session
  loadingMessages.value = true
  highlightedIndex.value = -1
  
  try {
    const res = await fetch(`/api/sessions/${session.id}`)
    const data = await res.json()
    messages.value = data.messages
  } catch (err) {
    console.error('Failed to load session:', err)
  } finally {
    loadingMessages.value = false
  }
  
  // If we have a timestamp to find, locate and scroll to that exact message
  if (scrollToText && messages.value.length > 0) {
    // Wait for DOM to render the messages
    setTimeout(() => {
      const displayed = displayMessages.value
      
      // Find the message with matching timestamp
      for (let i = 0; i < displayed.length; i++) {
        if (displayed[i].timestamp === scrollToText) {
          highlightedIndex.value = i
          // Small delay to ensure highlight class is applied
          setTimeout(() => {
            const el = document.querySelector(`[data-msg-index="${i}"]`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 50)
          break
        }
      }
    }, 50)
  }
}

const backToList = () => {
  selectedSession.value = null
  messages.value = []
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMessageText = (msg) => {
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')
  }
  return ''
}

const displayMessages = computed(() => {
  return messages.value.filter(m => {
    const text = getMessageText(m)
    return text && m.role !== 'system'
  })
})
</script>

<template>
  <div class="conversations">
    <!-- Session Detail View -->
    <template v-if="selectedSession">
      <div class="session-header">
        <button @click="backToList" class="back-btn">← Back</button>
        <div class="session-info">
          <h2>Conversation</h2>
          <span class="session-date">{{ formatDate(selectedSession.updatedAt) }}</span>
        </div>
      </div>
      
      <div v-if="loadingMessages" class="loading">Loading messages...</div>
      
      <div v-else class="messages">
        <div 
          v-for="(msg, idx) in displayMessages" 
          :key="idx"
          :data-msg-index="idx"
          class="message"
          :class="[msg.role, { highlighted: idx === highlightedIndex }]"
        >
          <div class="message-role">{{ msg.role === 'user' ? '👤 You' : '🦉 George' }}</div>
          <div class="message-content">{{ getMessageText(msg) }}</div>
        </div>
      </div>
    </template>

    <!-- Sessions List View -->
    <template v-else>
      <div class="list-header">
        <h2>📜 Conversations</h2>
        <span class="session-count">{{ sessions.length }} sessions</span>
      </div>

      <div v-if="loading" class="loading">Loading sessions...</div>
      
      <div v-else class="sessions-list">
        <div 
          v-for="session in sessions" 
          :key="session.id"
          class="session-card"
          @click="loadSession(session)"
        >
          <div class="session-preview">{{ session.preview }}</div>
          <div class="session-meta">
            <span class="session-date">{{ formatDate(session.updatedAt) }}</span>
            <span class="session-msgs">{{ session.messageCount }} msgs</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.conversations {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header, .session-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #334155;
}

.list-header h2, .session-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

.session-count, .session-date {
  color: #64748b;
  font-size: 0.9rem;
}

.back-btn {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.back-btn:hover {
  background: #475569;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.loading {
  text-align: center;
  color: #64748b;
  padding: 2rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.session-card {
  background: #0f172a;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  border-left: 3px solid #6366f1;
}

.session-card:hover {
  background: #1a2744;
  transform: translateX(4px);
}

.session-preview {
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  color: #e2e8f0;
}

.session-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #64748b;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  max-width: 85%;
}

.message.user {
  background: #1e3a5f;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.message.assistant {
  background: #1e293b;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.message.highlighted {
  box-shadow: 0 0 0 2px #6366f1, 0 0 20px rgba(99, 102, 241, 0.3);
  animation: pulse-highlight 2s ease-out;
}

@keyframes pulse-highlight {
  0% { box-shadow: 0 0 0 2px #6366f1, 0 0 30px rgba(99, 102, 241, 0.5); }
  100% { box-shadow: 0 0 0 2px #6366f1, 0 0 20px rgba(99, 102, 241, 0.3); }
}

.message-role {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
