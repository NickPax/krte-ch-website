<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const status = ref(null)
const error = ref(null)
const loading = ref(true)
const fetchStatus = async () => {
  try {
    const res = await fetch('/api/openclaw/status')
    if (!res.ok) throw new Error('Failed to fetch')
    status.value = await res.json()
    error.value = null
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

let interval = null

onMounted(() => {
  fetchStatus()
  // Poll every 30 seconds
  interval = setInterval(fetchStatus, 30000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const formatTokens = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

const formatAge = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="session-status">
    <div v-if="loading" class="status-loading">⏳</div>
    <div v-else-if="error" class="status-error" title="OpenClaw gateway unreachable">⚠️</div>
    <div v-else-if="status" class="status-info">
      <div class="status-item" :title="`Model: ${status.model || 'unknown'}`">
        <span class="status-icon">🧠</span>
        <span class="status-value">{{ status.model?.replace('anthropic/', '').replace('claude-', '').split('-')[0] || status.model || 'N/A' }}</span>
      </div>
      <div class="status-item" :title="`Context: ${formatTokens(status.contextSize || 0)} / ${formatTokens(status.contextWindow || 0)}`">
        <span class="status-icon">📚</span>
        <span class="status-value">{{ Math.round(((status.contextSize || 0) / (status.contextWindow || 1)) * 100) }}%</span>
      </div>
      <span v-if="status.updatedAt" class="last-update" :title="`Last updated: ${new Date(status.updatedAt).toLocaleString()}\nGeorge updates this during heartbeats`">
        {{ formatAge(status.updatedAt) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.session-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-loading, .status-error {
  font-size: 1.2rem;
  opacity: 0.6;
}

.status-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #1e293b;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  cursor: help;
  transition: background 0.2s;
}

.status-item:hover {
  background: #334155;
}

.status-icon {
  font-size: 0.9rem;
}

.status-value {
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
}

.last-update {
  font-size: 0.75rem;
  color: #64748b;
  padding: 0 0.25rem;
  cursor: help;
}
</style>
