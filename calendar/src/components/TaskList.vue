<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: Array,
  projects: Array,
  getProjectColor: Function,
  getProjectEmoji: Function
})

const emit = defineEmits(['updateStatus', 'deleteTask', 'demoteToNest'])

const statusOrder = ['in-progress', 'todo', 'blocked', 'done']

const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => {
    const aOrder = statusOrder.indexOf(a.status)
    const bOrder = statusOrder.indexOf(b.status)
    return aOrder - bOrder
  })
})

const statusLabels = {
  'todo': '📋 To Do',
  'in-progress': '🔄 In Progress',
  'blocked': '🚫 Blocked',
  'done': '✅ Done'
}

const statusColors = {
  'todo': '#64748b',
  'in-progress': '#3b82f6',
  'blocked': '#ef4444',
  'done': '#10b981'
}

const cycleStatus = (task) => {
  const currentIndex = statusOrder.indexOf(task.status)
  const nextIndex = (currentIndex + 1) % statusOrder.length
  emit('updateStatus', task.id, statusOrder[nextIndex])
}

const formatDate = (dateStr) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="task-list">
    <h2>📋 Tasks</h2>
    
    <div class="tasks">
      <div 
        v-for="task in sortedTasks" 
        :key="task.id" 
        class="task-card"
        :style="{ borderLeftColor: getProjectColor(task.project) }"
      >
        <div class="task-header">
          <span class="task-project">
            {{ getProjectEmoji(task.project) }}
          </span>
          <div class="task-actions">
            <span 
              class="task-status"
              :style="{ backgroundColor: statusColors[task.status] }"
              @click="cycleStatus(task)"
              :title="'Click to change status'"
            >
              {{ statusLabels[task.status] }}
            </span>
            <button 
              class="nest-btn" 
              @click="emit('demoteToNest', task)"
              title="Move to Nest"
            >🪺</button>
            <button 
              class="delete-btn" 
              @click="emit('deleteTask', task.id)"
              title="Delete task"
            >×</button>
          </div>
        </div>
        
        <h3 class="task-title">{{ task.title }}</h3>
        
        <p v-if="task.notes" class="task-notes">{{ task.notes }}</p>
        
        <div class="task-meta">
          <span v-if="task.dueDate" class="task-due">
            📅 {{ formatDate(task.dueDate) }}
          </span>
          <span v-if="task.remind" class="task-remind" title="George will remind you">
            🔔
          </span>
        </div>
      </div>
    </div>
    
    <div v-if="sortedTasks.length === 0" class="no-tasks">
      No tasks for this project
    </div>
  </div>
</template>

<style scoped>
.task-list {
  background: #1e293b;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #334155;
}

.task-list h2 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-card {
  background: #0f172a;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid;
  transition: transform 0.2s, box-shadow 0.2s;
}

.task-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nest-btn, .delete-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 0.25rem;
  transition: opacity 0.2s, color 0.2s, transform 0.2s;
}

.nest-btn:hover {
  transform: scale(1.2);
}

.delete-btn:hover {
  color: #ef4444;
}

.task-project {
  font-size: 1.2rem;
}

.task-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;
}

.task-status:hover {
  opacity: 0.8;
}

.task-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.4;
}

.task-notes {
  margin: 0.5rem 0 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.4;
}

.task-meta {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.task-due {
  font-size: 0.8rem;
  color: #60a5fa;
}

.task-remind {
  font-size: 0.9rem;
}

.no-tasks {
  text-align: center;
  color: #64748b;
  padding: 2rem;
  font-style: italic;
}

/* Mobile */
@media (max-width: 768px) {
  .task-list {
    padding: 0.75rem;
  }
  
  .task-list h3 {
    font-size: 0.95rem;
  }
  
  .task-item {
    padding: 0.6rem;
  }
  
  .task-title {
    font-size: 0.85rem;
  }
  
  .task-meta {
    font-size: 0.75rem;
    gap: 0.4rem;
  }
  
  .task-actions {
    gap: 0.2rem;
  }
  
  .task-actions button {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
  }
}
</style>
