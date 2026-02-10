<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  task: Object,
  visible: Boolean,
  projects: Array,
  getProjectColor: Function,
  getProjectEmoji: Function
})

const emit = defineEmits(['close', 'save', 'delete', 'openBoard'])

const editMode = ref(false)
const editedTask = ref({})

watch(() => props.task, (newTask) => {
  if (newTask) {
    editedTask.value = { ...newTask }
    editMode.value = false
  }
}, { immediate: true })

const project = computed(() => {
  return props.projects?.find(p => p.id === editedTask.value?.project)
})

const statusOptions = [
  { value: 'todo', label: '📋 To Do' },
  { value: 'in-progress', label: '🔄 In Progress' },
  { value: 'blocked', label: '🚫 Blocked' },
  { value: 'done', label: '✅ Done' }
]

const reminderOptions = [
  { value: 'morning', label: '🌅 Morning only (~08:00)' },
  { value: '60', label: '⏰ 1 hour before' },
  { value: '30', label: '⏰ 30 min before' },
  { value: '15', label: '⏰ 15 min before' },
  { value: 'both-60', label: '🌅 + ⏰ Morning & 1hr before' },
  { value: 'both-30', label: '🌅 + ⏰ Morning & 30min before' }
]

// Parse time from title like "(14:40)" or "(10:30)"
const parsedTime = computed(() => {
  if (!props.task?.title) return null
  const match = props.task.title.match(/\((\d{1,2})[:\.](\d{2})\)/)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes, formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` }
    }
  }
  return null
})

// Calculate reminder time based on event time and offset
const getReminderTime = (dueDate, eventTime, minutesBefore) => {
  if (!dueDate || !eventTime) return null
  const dt = new Date(dueDate + 'T00:00:00')
  dt.setHours(eventTime.hours, eventTime.minutes, 0, 0)
  dt.setMinutes(dt.getMinutes() - minutesBefore)
  return dt
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'No due date'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  })
}

const save = () => {
  emit('save', editedTask.value)
  editMode.value = false
}

const cancel = () => {
  editedTask.value = { ...props.task }
  editMode.value = false
}

const markDone = () => {
  editedTask.value.status = 'done'
  emit('save', editedTask.value)
}

const deleteTask = () => {
  if (confirm('Delete this task?')) {
    emit('delete', editedTask.value.id)
  }
}

// Reminder info
const reminderInfo = computed(() => {
  if (!props.task?.remind || !props.task?.dueDate) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(props.task.dueDate + 'T00:00:00')
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayBefore = new Date(dueDate)
  dayBefore.setDate(dayBefore.getDate() - 1)
  
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
  
  const formatShort = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatTime = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
  const reminderType = props.task.reminderBefore || 'morning'
  const eventTime = parsedTime.value
  
  let schedule = []
  
  // Morning reminders (day before and day of)
  if (reminderType === 'morning' || reminderType.startsWith('both')) {
    if (diffDays < 0) {
      schedule.push('Task is overdue - no reminders')
    } else if (diffDays === 0) {
      schedule.push('✓ Morning: Sent today ~08:00')
    } else if (diffDays === 1) {
      schedule.push('📬 Morning: Today ~08:00 (sent or soon)')
      schedule.push(`📅 Morning: Tomorrow ~08:00`)
    } else {
      schedule.push(`📅 Morning: ${formatShort(dayBefore)} ~08:00`)
      schedule.push(`📅 Morning: ${formatShort(dueDate)} ~08:00`)
    }
  }
  
  // Time-based reminders (X minutes before event)
  if (eventTime && reminderType !== 'morning') {
    const minsBefore = reminderType.startsWith('both') 
      ? parseInt(reminderType.split('-')[1], 10) 
      : parseInt(reminderType, 10)
    
    if (minsBefore && diffDays >= 0) {
      const reminderDt = getReminderTime(props.task.dueDate, eventTime, minsBefore)
      if (reminderDt) {
        const isPast = reminderDt < new Date()
        const label = minsBefore >= 60 ? `${minsBefore/60}hr` : `${minsBefore}min`
        if (isPast) {
          schedule.push(`✓ ${label} before: Already passed`)
        } else if (diffDays === 0) {
          schedule.push(`⏰ ${label} before: Today ${formatTime(reminderDt)}`)
        } else if (diffDays === 1) {
          schedule.push(`⏰ ${label} before: Tomorrow ${formatTime(reminderDt)}`)
        } else {
          schedule.push(`⏰ ${label} before: ${formatShort(dueDate)} ${formatTime(reminderDt)}`)
        }
      }
    }
  }
  
  const statusText = diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : 'future'
  
  return {
    text: diffDays < 0 ? 'Task is overdue' : diffDays === 0 ? 'Due today!' : diffDays === 1 ? 'Due tomorrow' : `Due ${formatShort(dueDate)}`,
    schedule: schedule.join('\n'),
    status: statusText,
    hasEventTime: !!eventTime,
    eventTime: eventTime?.formatted
  }
})

const toggleReminder = () => {
  editedTask.value.remind = !editedTask.value.remind
  emit('save', editedTask.value)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible && task" class="task-detail-overlay" @click.self="emit('close')">
        <div class="task-detail-panel">
          <div class="panel-header">
            <div class="header-left">
              <span 
                class="project-badge"
                :style="{ backgroundColor: getProjectColor(task.project) }"
                @click="emit('openBoard', task.project)"
                title="Open project board"
              >
                {{ getProjectEmoji(task.project) }} {{ project?.name }}
              </span>
            </div>
            <div class="header-actions">
              <button v-if="!editMode" @click="editMode = true" class="edit-btn" title="Edit">✏️</button>
              <button @click="emit('close')" class="close-btn" title="Close">✕</button>
            </div>
          </div>

          <!-- View Mode -->
          <template v-if="!editMode">
            <div class="task-content">
              <h2 class="task-title">{{ task.title }}</h2>
              
              <div class="task-meta">
                <div class="meta-item">
                  <span class="meta-label">Status</span>
                  <span class="status-badge" :class="task.status">
                    {{ statusOptions.find(s => s.value === task.status)?.label || task.status }}
                  </span>
                </div>
                
                <div class="meta-item">
                  <span class="meta-label">Due Date</span>
                  <span class="due-date" :class="{ overdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' }">
                    {{ formatDate(task.dueDate) }}
                  </span>
                </div>
                
                </div>

              <!-- Reminder Section -->
              <div v-if="task.remind || task.dueDate" class="reminder-section">
                <div class="reminder-header">
                  <span class="reminder-icon">🦉</span>
                  <span class="reminder-title">Telegram Reminder</span>
                  <span v-if="reminderInfo?.eventTime" class="event-time">Event @ {{ reminderInfo.eventTime }}</span>
                </div>
                <div v-if="task.remind" class="reminder-body">
                  <p class="reminder-status" :class="reminderInfo?.status">
                    {{ reminderInfo?.text || 'Set a due date to enable reminders' }}
                  </p>
                  
                  <!-- Reminder type selector -->
                  <div v-if="reminderInfo?.hasEventTime" class="reminder-type-select">
                    <label>When to remind:</label>
                    <select v-model="editedTask.reminderBefore" @change="emit('save', editedTask)">
                      <option v-for="opt in reminderOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <p v-else class="reminder-type-hint">💡 Add a time to the title like "(14:30)" for time-based reminders</p>
                  
                  <pre v-if="reminderInfo?.schedule" class="reminder-schedule">{{ reminderInfo.schedule }}</pre>
                  <button @click="toggleReminder" class="reminder-toggle off">
                    🔕 Turn Off Reminder
                  </button>
                </div>
                <div v-else class="reminder-body">
                  <p class="reminder-status disabled">Reminder is off</p>
                  <button v-if="task.dueDate" @click="toggleReminder" class="reminder-toggle on">
                    🔔 Turn On Reminder
                  </button>
                  <p v-else class="reminder-note">Set a due date first to enable reminders.</p>
                </div>
              </div>

              <div v-if="task.notes" class="task-notes">
                <h3>Notes</h3>
                <p>{{ task.notes }}</p>
              </div>

              <div class="action-buttons">
                <button v-if="task.status !== 'done'" @click="markDone" class="done-btn">
                  ✓ Mark as Done
                </button>
                <button @click="deleteTask" class="delete-btn">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </template>

          <!-- Edit Mode -->
          <template v-else>
            <div class="task-edit">
              <div class="form-group">
                <label>Title</label>
                <input v-model="editedTask.title" type="text" />
              </div>

              <div class="form-group">
                <label>Project</label>
                <select v-model="editedTask.project">
                  <option v-for="p in projects" :key="p.id" :value="p.id">
                    {{ p.emoji }} {{ p.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Status</label>
                <select v-model="editedTask.status">
                  <option v-for="s in statusOptions" :key="s.value" :value="s.value">
                    {{ s.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Due Date</label>
                <input v-model="editedTask.dueDate" type="date" />
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea v-model="editedTask.notes" rows="5"></textarea>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="editedTask.remind" />
                  <span>🦉 Remind me on Telegram</span>
                </label>
              </div>

              <div class="edit-actions">
                <button @click="cancel" class="cancel-btn">Cancel</button>
                <button @click="save" class="save-btn">Save Changes</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.task-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.task-detail-panel {
  width: 450px;
  max-width: 100%;
  height: 100%;
  background: #1e293b;
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #334155;
  background: #0f172a;
}

.project-badge {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-badge:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn, .close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
}

.edit-btn:hover, .close-btn:hover {
  background: #334155;
  color: #e2e8f0;
}

.task-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.task-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1.3;
  color: #ffffff;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.meta-label {
  color: #64748b;
  font-size: 0.85rem;
  min-width: 80px;
}

.status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  background: #334155;
}

.status-badge.todo { background: #475569; }
.status-badge.in-progress { background: #1d4ed8; }
.status-badge.blocked { background: #dc2626; }
.status-badge.done { background: #16a34a; }

.due-date {
  font-size: 0.95rem;
}

.due-date.overdue {
  color: #f87171;
  font-weight: 500;
}

/* Reminder Section */
.reminder-section {
  background: #0f172a;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #334155;
}

.reminder-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #f1f5f9;
}

.reminder-icon {
  font-size: 1.2rem;
}

.reminder-title {
  font-weight: 600;
  font-size: 1rem;
  flex: 1;
  color: #ffffff;
}

.event-time {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.reminder-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reminder-status {
  margin: 0;
  font-size: 0.9rem;
  color: #e2e8f0;
}

.reminder-status.today {
  color: #4ade80;
}

.reminder-status.tomorrow {
  color: #60a5fa;
}

.reminder-status.overdue {
  color: #f87171;
}

.reminder-status.disabled {
  color: #64748b;
}

.reminder-type-select {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.reminder-type-select label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.reminder-type-select select {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

.reminder-type-select select:focus {
  outline: none;
  border-color: #3b82f6;
}

.reminder-type-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
  font-style: italic;
}

.reminder-schedule {
  margin: 0;
  font-size: 0.85rem;
  color: #cbd5e1;
  line-height: 1.8;
  font-family: inherit;
  background: #1e293b;
  padding: 0.75rem;
  border-radius: 6px;
}

.reminder-note {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.5;
}

.reminder-toggle {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
  border: none;
}

.reminder-toggle.off {
  background: #334155;
  color: #e2e8f0;
}

.reminder-toggle.off:hover {
  background: #475569;
}

.reminder-toggle.on {
  background: #6366f1;
  color: white;
}

.reminder-toggle.on:hover {
  background: #4f46e5;
}

.task-notes {
  background: #0f172a;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.task-notes h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.task-notes p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  color: #e2e8f0;
  font-size: 0.95rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1rem;
}

.done-btn {
  flex: 1;
  background: #16a34a;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s;
}

.done-btn:hover {
  background: #15803d;
}

.delete-btn {
  background: transparent;
  color: #f87171;
  border: 1px solid #f87171;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: rgba(248, 113, 113, 0.1);
}

/* Edit Mode */
.task-edit {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
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
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #6366f1;
}

.edit-actions {
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

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease;
}

.slide-enter-active .task-detail-panel,
.slide-leave-active .task-detail-panel {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .task-detail-panel,
.slide-leave-to .task-detail-panel {
  transform: translateX(100%);
}

/* Mobile */
@media (max-width: 768px) {
  .task-detail-panel {
    width: 100%;
  }
}
</style>
