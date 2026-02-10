<script setup>
import { ref, watch, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  path: String,
  visible: Boolean
})

const emit = defineEmits(['close', 'save'])

const content = ref('')
const originalContent = ref('')
const loading = ref(false)
const error = ref(null)
const editing = ref(false)
const docMeta = ref(null)
const htmlPreviewMode = ref(true) // true = preview, false = source

const isDirty = computed(() => content.value !== originalContent.value)

const renderedContent = computed(() => {
  if (!content.value) return ''
  return marked(content.value)
})

const fileName = computed(() => {
  if (!props.path) return ''
  return props.path.split('/').pop()
})

const isHtmlFile = computed(() => {
  return fileName.value.endsWith('.html') || fileName.value.endsWith('.htm')
})

const isMarkdownFile = computed(() => {
  return fileName.value.endsWith('.md')
})

const toggleHtmlPreview = () => {
  htmlPreviewMode.value = !htmlPreviewMode.value
}

watch(() => props.path, async (newPath) => {
  if (newPath) {
    await loadDocument(newPath)
  }
}, { immediate: true })

async function loadDocument(path) {
  loading.value = true
  error.value = null
  editing.value = false
  
  try {
    const res = await fetch(`/api/docs?path=${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error('Failed to load document')
    const data = await res.json()
    content.value = data.content
    originalContent.value = data.content
    docMeta.value = data
  } catch (err) {
    error.value = err.message
    content.value = ''
  } finally {
    loading.value = false
  }
}

async function saveDocument() {
  if (!props.path || !isDirty.value) return
  
  try {
    const res = await fetch(`/api/docs?path=${encodeURIComponent(props.path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.value })
    })
    if (!res.ok) throw new Error('Failed to save')
    originalContent.value = content.value
    editing.value = false
    emit('save', props.path)
  } catch (err) {
    error.value = err.message
  }
}

function toggleEdit() {
  editing.value = !editing.value
}

function close() {
  emit('close')
}
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="doc-viewer">
      <div class="doc-header">
        <span class="doc-title">📄 {{ fileName }}</span>
        <div class="doc-actions">
          <button 
            v-if="isHtmlFile && !editing" 
            @click="toggleHtmlPreview" 
            class="doc-btn"
            :title="htmlPreviewMode ? 'View Source' : 'View Preview'"
          >{{ htmlPreviewMode ? '&lt;/&gt;' : '👁️' }}</button>
          <button 
            v-if="!editing" 
            @click="toggleEdit" 
            class="doc-btn"
            title="Edit"
          >✏️</button>
          <button 
            v-if="editing && isDirty" 
            @click="saveDocument" 
            class="doc-btn doc-btn-save"
            title="Save"
          >💾</button>
          <button 
            v-if="editing" 
            @click="toggleEdit" 
            class="doc-btn"
            title="Cancel"
          >✕</button>
          <button @click="close" class="doc-btn doc-btn-close" title="Close">✕</button>
        </div>
      </div>
      
      <div class="doc-path">{{ path }}</div>
      
      <div v-if="loading" class="doc-loading">Loading...</div>
      <div v-else-if="error" class="doc-error">{{ error }}</div>
      <div v-else class="doc-content">
        <!-- Edit mode (any file type) -->
        <textarea 
          v-if="editing"
          v-model="content"
          class="doc-editor"
        ></textarea>
        
        <!-- HTML Preview mode -->
        <iframe 
          v-else-if="isHtmlFile && htmlPreviewMode"
          :srcdoc="content"
          class="doc-html-preview"
        ></iframe>
        
        <!-- HTML Source mode -->
        <pre v-else-if="isHtmlFile && !htmlPreviewMode" class="doc-source"><code>{{ content }}</code></pre>
        
        <!-- Markdown rendered -->
        <div 
          v-else-if="isMarkdownFile"
          class="doc-rendered markdown-body"
          v-html="renderedContent"
        ></div>
        
        <!-- Other files (plain text) -->
        <pre v-else class="doc-source"><code>{{ content }}</code></pre>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.doc-viewer {
  position: fixed;
  top: 0;
  right: 0;
  width: 50%;
  max-width: 700px;
  height: 100vh;
  background: #0f172a;
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  z-index: 100;
  box-shadow: -4px 0 20px rgba(0,0,0,0.3);
}

.doc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #334155;
  background: #1e293b;
}

.doc-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 1rem;
}

.doc-actions {
  display: flex;
  gap: 0.5rem;
}

.doc-btn {
  background: #334155;
  border: none;
  color: #e2e8f0;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.doc-btn:hover {
  background: #475569;
}

.doc-btn-save {
  background: #4ade80;
  color: #0f172a;
}

.doc-btn-save:hover {
  background: #22c55e;
}

.doc-btn-close {
  background: transparent;
  font-size: 1.2rem;
}

.doc-path {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: #64748b;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  font-family: monospace;
}

.doc-loading, .doc-error {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.doc-error {
  color: #ef4444;
}

.doc-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.doc-editor {
  width: 100%;
  height: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9rem;
  resize: none;
  line-height: 1.6;
}

.doc-editor:focus {
  outline: none;
  border-color: #6366f1;
}

.doc-rendered {
  color: #e2e8f0;
  line-height: 1.7;
}

.doc-rendered :deep(h1) {
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #334155;
}

.doc-rendered :deep(h2) {
  font-size: 1.2rem;
  margin: 1.5rem 0 0.75rem 0;
  color: #94a3b8;
}

.doc-rendered :deep(h3) {
  font-size: 1rem;
  margin: 1rem 0 0.5rem 0;
  color: #94a3b8;
}

.doc-rendered :deep(p) {
  margin: 0.75rem 0;
}

.doc-rendered :deep(ul), .doc-rendered :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.doc-rendered :deep(li) {
  margin: 0.25rem 0;
}

.doc-rendered :deep(code) {
  background: #1e293b;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Monaco', 'Menlo', monospace;
}

.doc-rendered :deep(pre) {
  background: #1e293b;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
}

.doc-rendered :deep(pre code) {
  background: transparent;
  padding: 0;
}

.doc-rendered :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.doc-rendered :deep(th), .doc-rendered :deep(td) {
  border: 1px solid #334155;
  padding: 0.5rem;
  text-align: left;
}

.doc-rendered :deep(th) {
  background: #1e293b;
}

.doc-rendered :deep(strong) {
  color: #f8fafc;
}

.doc-rendered :deep(a) {
  color: #6366f1;
}

.doc-html-preview {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  border-radius: 8px;
}

.doc-source {
  background: #1e293b;
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
  margin: 0;
  height: 100%;
}

.doc-source code {
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Slide transition */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}

/* Tablet */
@media (max-width: 1024px) {
  .doc-viewer {
    width: 70%;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .doc-viewer {
    width: 100%;
    max-width: none;
  }
  
  .doc-header {
    padding: 0.75rem;
  }
  
  .doc-title {
    font-size: 0.9rem;
  }
  
  .doc-btn {
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
  }
  
  .doc-path {
    font-size: 0.7rem;
    padding: 0.4rem 0.75rem;
  }
  
  .doc-content {
    padding: 0.75rem;
  }
  
  .doc-editor {
    font-size: 0.85rem;
    padding: 0.75rem;
  }
  
  .doc-rendered {
    font-size: 0.9rem;
  }
  
  .doc-rendered :deep(h1) {
    font-size: 1.3rem;
  }
  
  .doc-rendered :deep(h2) {
    font-size: 1.1rem;
  }
  
  .doc-rendered :deep(pre) {
    padding: 0.75rem;
    font-size: 0.8rem;
  }
}
</style>
