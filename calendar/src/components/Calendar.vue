<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  currentDate: Date,
  events: Array,
  tasks: Array,
  projects: Array,
  getProjectColor: Function
})

const emit = defineEmits(['openTask', 'updateTaskDate'])

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Drag and drop
const draggedTask = ref(null)

const onDragStart = (event, task) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.id)
}

const onDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

const onDrop = (event, day) => {
  event.preventDefault()
  if (draggedTask.value) {
    const newDate = formatDate(day.fullDate)
    emit('updateTaskDate', draggedTask.value.id, newDate)
    draggedTask.value = null
  }
}

const onDragEnd = () => {
  draggedTask.value = null
}

const calendarDays = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6
  
  const days = []
  
  // Previous month days
  const prevMonth = new Date(year, month, 0)
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      date: prevMonth.getDate() - i,
      currentMonth: false,
      fullDate: new Date(year, month - 1, prevMonth.getDate() - i)
    })
  }
  
  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({
      date: i,
      currentMonth: true,
      fullDate: new Date(year, month, i)
    })
  }
  
  // Next month days
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      currentMonth: false,
      fullDate: new Date(year, month + 1, i)
    })
  }
  
  return days
})

const isToday = (day) => {
  const today = new Date()
  return day.fullDate.toDateString() === today.toDateString()
}

const formatDate = (date) => {
  // Use local date, not UTC (toISOString converts to UTC which shifts dates)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getEventsForDay = (day) => {
  const dateStr = formatDate(day.fullDate)
  const dayEvents = props.events.filter(e => e.date === dateStr)
  // Only show non-done tasks on calendar
  const dayTasks = props.tasks.filter(t => t.dueDate === dateStr && t.status !== 'done')
  return [...dayEvents, ...dayTasks.map(t => ({ ...t, isTask: true }))]
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <div v-for="day in daysOfWeek" :key="day" class="day-header">
        {{ day }}
      </div>
    </div>
    <div class="calendar-grid">
      <div 
        v-for="(day, index) in calendarDays" 
        :key="index" 
        class="calendar-day"
        :class="{ 
          'other-month': !day.currentMonth,
          'today': isToday(day),
          'drag-over': draggedTask
        }"
        @dragover="onDragOver"
        @drop="onDrop($event, day)"
      >
        <span class="day-number">{{ day.date }}</span>
        <div class="day-events">
          <div 
            v-for="event in getEventsForDay(day)" 
            :key="event.id"
            class="event-dot"
            :class="{ dragging: draggedTask?.id === event.id }"
            :style="{ backgroundColor: getProjectColor(event.project) }"
            :title="event.title + (event.isTask ? ' (drag to move, click to view)' : '')"
            :draggable="event.isTask"
            @click.stop="event.isTask && emit('openTask', event)"
            @dragstart="event.isTask && onDragStart($event, event)"
            @dragend="onDragEnd"
          >
            <span class="event-text">{{ event.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  width: 100%;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.5rem;
}

.day-header {
  text-align: center;
  font-weight: 600;
  color: #94a3b8;
  padding: 0.5rem;
  font-size: 0.85rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.calendar-day {
  aspect-ratio: 1;
  background: #0f172a;
  border-radius: 8px;
  padding: 0.5rem;
  position: relative;
  min-height: 80px;
  transition: background 0.2s;
}

.calendar-day:hover {
  background: #1a2744;
}

.calendar-day.other-month {
  opacity: 0.4;
}

.calendar-day.today {
  background: #1e3a5f;
  box-shadow: inset 0 0 0 2px #3b82f6;
}

.day-number {
  font-weight: 500;
  font-size: 0.9rem;
}

.today .day-number {
  color: #60a5fa;
  font-weight: 700;
}

.day-events {
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.event-dot {
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.event-dot:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.event-dot[draggable="true"] {
  cursor: grab;
}

.event-dot[draggable="true"]:active {
  cursor: grabbing;
}

.event-dot.dragging {
  opacity: 0.5;
}

.calendar-day.drag-over:hover {
  background: #1e3a5f;
  box-shadow: inset 0 0 0 2px #3b82f6;
}

.event-text {
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* Tablet */
@media (max-width: 1024px) {
  .calendar {
    font-size: 0.9rem;
  }
  
  .day-cell {
    min-height: 80px;
    padding: 0.4rem;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .calendar {
    font-size: 0.8rem;
  }
  
  .weekday-header {
    padding: 0.4rem;
    font-size: 0.7rem;
  }
  
  .day-cell {
    min-height: 60px;
    padding: 0.3rem;
  }
  
  .day-number {
    font-size: 0.8rem;
  }
  
  .event-dot {
    font-size: 0.65rem;
    padding: 0.15rem 0.3rem;
    margin: 1px 0;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .weekday-header {
    font-size: 0.6rem;
    padding: 0.3rem;
  }
  
  .day-cell {
    min-height: 50px;
    padding: 0.2rem;
  }
  
  .day-number {
    font-size: 0.7rem;
  }
  
  .event-dot {
    font-size: 0.6rem;
    padding: 0.1rem 0.2rem;
  }
}
</style>
