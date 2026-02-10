<script setup>
import { ref, defineEmits, defineProps } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['add', 'complete', 'remove', 'promote', 'viewAnswer', 'edit'])

const newItem = ref('')
const editId = ref(null)
const editText = ref('')

const addItem = () => {
  if (!newItem.value.trim()) return
  emit('add', newItem.value.trim())
  newItem.value = ''
}

const startEdit = (item) => {
  editId.value = item.id
  editText.value = item.text
}

const saveEdit = () => {
  if (!editText.value.trim()) return
  emit('edit', editId.value, editText.value.trim())
  cancelEdit()
}

const cancelEdit = () => {
  editId.value = null
  editText.value = ''
}

const complete = (id) => {
  emit('complete', id)
}

const remove = (id) => {
  emit('remove', id)
}

const promote = (item) => {
  emit('promote', item)
}

const viewAnswer = (item) => {
  emit('viewAnswer', item.answerFile)
}
</script>

<template>
  <div class="nest">
    <div class="nest-header">
      <span class="nest-icon">🪺</span>
      <span class="nest-title">The Nest</span>
      <span class="nest-count" v-if="items.length">{{ items.length }}</span>
    </div>
    
    <div class="nest-input-row">
      <input 
        v-model="newItem"
        @keyup.enter="addItem"
        type="text" 
        placeholder="Quick thought or question..."
        class="nest-input"
      />
      <button @click="addItem" class="nest-add-btn">+</button>
    </div>

    <TransitionGroup name="nest-item" tag="div" class="nest-items">
      <div 
        v-for="item in items" 
        :key="item.id"
        class="nest-item"
        :class="{ 'nest-item-answered': item.status === 'answered' }"
      >
        <button @click="complete(item.id)" class="nest-check" title="Done">✓</button>
        
        <!-- Edit mode -->
        <template v-if="editId === item.id">
          <input 
            v-model="editText"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
            class="nest-edit-input"
            autofocus
          />
          <button @click="saveEdit" class="nest-save" title="Save">✓</button>
          <button @click="cancelEdit" class="nest-cancel" title="Cancel">×</button>
        </template>
        
        <!-- View mode -->
        <template v-else>
          <span class="nest-text" :title="item.text">{{ item.text }}</span>
          <div class="nest-actions">
            <button 
              v-if="item.answerFile" 
              @click="viewAnswer(item)" 
              class="nest-view-answer" 
              title="View answer"
            >📄</button>
            <button @click="startEdit(item)" class="nest-edit" title="Edit">✏️</button>
            <button @click="promote(item)" class="nest-promote" title="Promote to task">↑</button>
            <button @click="remove(item.id)" class="nest-remove" title="Delete">×</button>
          </div>
        </template>
      </div>
    </TransitionGroup>

    <div v-if="!items.length" class="nest-empty">
      Nest is empty 🪶
    </div>
  </div>
</template>

<style scoped>
.nest {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #334155;
}

.nest-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.nest-icon {
  font-size: 1.2rem;
}

.nest-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.95rem;
}

.nest-count {
  background: #6366f1;
  color: white;
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
}

.nest-input-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.nest-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.nest-input:focus {
  outline: none;
  border-color: #6366f1;
}

.nest-input::placeholder {
  color: #64748b;
}

.nest-add-btn {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nest-add-btn:hover {
  background: #4f46e5;
}

.nest-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.nest-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #0f172a;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #6366f1;
}

.nest-item-answered {
  border-left-color: #4ade80;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.05) 0%, #0f172a 50%);
}

.nest-check {
  background: transparent;
  border: 1px solid #4ade80;
  color: #4ade80;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.nest-check:hover {
  opacity: 1;
  background: #4ade80;
  color: #0f172a;
}

.nest-text {
  flex: 1;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.nest-actions {
  display: flex;
  gap: 0.25rem;
}

.nest-view-answer {
  background: transparent;
  border: none;
  color: #4ade80;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.nest-view-answer:hover {
  background: #334155;
}

.nest-promote, .nest-remove, .nest-edit {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.nest-promote:hover {
  background: #334155;
  color: #6366f1;
}

.nest-edit:hover {
  background: #334155;
  color: #f59e0b;
}

.nest-remove:hover {
  background: #334155;
  color: #ef4444;
}

.nest-edit-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #6366f1;
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.nest-edit-input:focus {
  outline: none;
}

.nest-save, .nest-cancel {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.nest-save {
  color: #4ade80;
}

.nest-save:hover {
  background: #334155;
}

.nest-cancel {
  color: #ef4444;
}

.nest-cancel:hover {
  background: #334155;
}

.nest-empty {
  color: #64748b;
  font-size: 0.85rem;
  text-align: center;
  padding: 0.5rem;
}

/* Transitions */
.nest-item-enter-active {
  transition: all 0.3s ease;
}

.nest-item-leave-active {
  transition: all 0.2s ease;
}

.nest-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.nest-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Mobile */
@media (max-width: 768px) {
  .nest {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .nest-title {
    font-size: 0.9rem;
  }
  
  .nest-input {
    font-size: 0.85rem;
    padding: 0.4rem 0.6rem;
  }
  
  .nest-add-btn {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .nest-item {
    padding: 0.4rem 0.6rem;
  }
  
  .nest-text {
    font-size: 0.85rem;
  }
  
  .nest-check {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }
  
  .nest-actions {
    gap: 0.1rem;
  }
  
  .nest-view-answer,
  .nest-promote,
  .nest-remove {
    padding: 0.2rem 0.3rem;
    font-size: 0.8rem;
  }
}
</style>
