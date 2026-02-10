<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  tasks: Array,
  project: Object,
  getProjectColor: Function,
  getProjectEmoji: Function
})

const emit = defineEmits(['updateStatus', 'deleteTask', 'addTask', 'back'])

const showAddForm = ref(null) // Which column is showing the add form
const newTaskTitle = ref('')
const newTaskNotes = ref('')
const newTaskDate = ref('')
const newTaskRemind = ref(false)

const columns = [
  { id: 'todo', label: '📋 To Do', color: '#64748b' },
  { id: 'in-progress', label: '🔄 In Progress', color: '#3b82f6' },
  { id: 'blocked', label: '🚫 Blocked', color: '#ef4444' },
  { id: 'done', label: '✅ Done', color: '#10b981' }
]

const draggedTask = ref(null)

const tasksByStatus = computed(() => {
  const grouped = {}
  columns.forEach(col => {
    grouped[col.id] = props.tasks.filter(t => t.status === col.id)
  })
  return grouped
})

const onDragStart = (task, event) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
}

const onDragEnd = (event) => {
  event.target.classList.remove('dragging')
  draggedTask.value = null
}

const onDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

const onDrop = (status, event) => {
  event.preventDefault()
  if (draggedTask.value && draggedTask.value.status !== status) {
    emit('updateStatus', draggedTask.value.id, status)
  }
  draggedTask.value = null
}

const formatDate = (dateStr) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const openAddForm = (columnId) => {
  showAddForm.value = columnId
  newTaskTitle.value = ''
  newTaskNotes.value = ''
  newTaskDate.value = ''
  newTaskRemind.value = false
}

const closeAddForm = () => {
  showAddForm.value = null
  newTaskTitle.value = ''
  newTaskNotes.value = ''
  newTaskDate.value = ''
  newTaskRemind.value = false
}

const submitNewTask = () => {
  if (!newTaskTitle.value.trim()) return
  
  emit('addTask', {
    title: newTaskTitle.value,
    project: props.project.id,
    status: showAddForm.value,
    notes: newTaskNotes.value || null,
    dueDate: newTaskDate.value || null,
    remind: newTaskRemind.value
  })
  
  closeAddForm()
}
</script>

<template>
  <div class="kanban">
    <div class="kanban-header">
      <button @click="emit('back')" class="back-btn">← Back to Calendar</button>
      <h2>
        <span class="project-emoji">{{ project.emoji }}</span>
        {{ project.name }}
      </h2>
      <div class="task-count">{{ tasks.length }} tasks</div>
    </div>

    <div class="kanban-board">
      <div 
        v-for="column in columns" 
        :key="column.id"
        class="kanban-column"
        @dragover="onDragOver"
        @drop="onDrop(column.id, $event)"
      >
        <div class="column-header" :style="{ borderBottomColor: column.color }">
          <span class="column-label">{{ column.label }}</span>
          <span class="column-count">{{ tasksByStatus[column.id].length }}</span>
        </div>
        
        <div class="column-tasks">
          <div 
            v-for="task in tasksByStatus[column.id]" 
            :key="task.id"
            class="kanban-card"
            draggable="true"
            @dragstart="onDragStart(task, $event)"
            @dragend="onDragEnd"
          >
            <div class="card-title">{{ task.title }}</div>
            <div v-if="task.notes" class="card-notes">{{ task.notes }}</div>
            <div class="card-footer">
              <div class="card-meta">
                <span v-if="task.dueDate" class="card-date">📅 {{ formatDate(task.dueDate) }}</span>
                <span v-if="task.remind" class="card-remind" title="George will remind you">🔔</span>
              </div>
              <button 
                class="card-delete" 
                @click.stop="emit('deleteTask', task.id)"
                title="Delete"
              >×</button>
            </div>
          </div>
          
          <!-- Add Task Form -->
          <div v-if="showAddForm === column.id" class="add-task-form">
            <input 
              v-model="newTaskTitle"
              type="text"
              placeholder="Task title..."
              @keyup.enter="submitNewTask"
              @keyup.esc="closeAddForm"
              autofocus
              class="add-input"
            />
            <input 
              v-model="newTaskDate"
              type="date"
              class="add-input add-date"
            />
            <textarea 
              v-model="newTaskNotes"
              placeholder="Notes (optional)"
              rows="2"
              class="add-textarea"
            ></textarea>
            <label class="remind-checkbox">
              <input type="checkbox" v-model="newTaskRemind" />
              <span>🦉 Remind me</span>
            </label>
            <div class="add-form-actions">
              <button @click="closeAddForm" class="add-cancel">Cancel</button>
              <button @click="submitNewTask" class="add-submit">Add</button>
            </div>
          </div>
          
          <!-- Add Task Button -->
          <button 
            v-else
            class="add-task-btn"
            @click="openAddForm(column.id)"
          >
            + Add task
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.kanban-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #334155;
}

.back-btn {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #475569;
}

.kanban-header h2 {
  margin: 0;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.project-emoji {
  font-size: 1.6rem;
}

.task-count {
  color: #64748b;
  font-size: 0.9rem;
  margin-left: auto;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.kanban-column {
  background: #0f172a;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.column-header {
  padding: 1rem;
  border-bottom: 3px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.column-count {
  background: #1e293b;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.column-tasks {
  padding: 0.75rem;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kanban-card {
  background: #1e293b;
  border-radius: 6px;
  padding: 0.75rem;
  cursor: grab;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 1px solid transparent;
}

.kanban-card:hover {
  border-color: #475569;
}

.kanban-card.dragging {
  opacity: 0.5;
  transform: rotate(3deg);
}

.kanban-card:active {
  cursor: grabbing;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.card-notes {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-date {
  font-size: 0.75rem;
  color: #60a5fa;
}

.card-remind {
  font-size: 0.8rem;
}

.card-delete {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.kanban-card:hover .card-delete {
  opacity: 1;
}

.card-delete:hover {
  color: #ef4444;
}

.add-task-btn {
  width: 100%;
  background: transparent;
  border: 2px dashed #334155;
  color: #64748b;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: border-color 0.2s, color 0.2s;
  margin-top: auto;
}

.add-task-btn:hover {
  border-color: #475569;
  color: #94a3b8;
}

.add-task-form {
  background: #1e293b;
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-input, .add-textarea {
  width: 100%;
  background: #0f172a;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: inherit;
}

.add-input:focus, .add-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.add-date {
  color-scheme: dark;
}

.add-textarea {
  resize: none;
}

.add-form-actions {
  display: flex;
  gap: 0.5rem;
}

.add-cancel, .add-submit {
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  border: none;
}

.add-cancel {
  background: #334155;
  color: #e2e8f0;
}

.add-cancel:hover {
  background: #475569;
}

.add-submit {
  background: #3b82f6;
  color: white;
}

.add-submit:hover {
  background: #2563eb;
}

.remind-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #94a3b8;
  cursor: pointer;
}

.remind-checkbox input {
  accent-color: #6366f1;
}

@media (max-width: 1000px) {
  .kanban-board {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .kanban-board {
    grid-template-columns: 1fr;
  }
}
</style>
