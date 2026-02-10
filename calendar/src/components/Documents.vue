<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['openDoc', 'newDoc'])

const projects = ref([])
const expandedProject = ref(null)
const expandedFolder = ref(null)
const loading = ref(false)
const newDocName = ref('')
const showNewDocInput = ref(false)
const newDocContext = ref(null) // { project, folder }
const renameContext = ref(null) // { project, folder, file }
const renameValue = ref('')
const fileInputRef = ref(null)
const uploadContext = ref(null) // { project, folder }

onMounted(async () => {
  await loadProjects()
})

async function loadProjects() {
  loading.value = true
  try {
    const res = await fetch('/api/projects')
    projects.value = await res.json()
  } catch (err) {
    console.error('Failed to load projects:', err)
  } finally {
    loading.value = false
  }
}

function toggleProject(name) {
  expandedProject.value = expandedProject.value === name ? null : name
  expandedFolder.value = null
}

function toggleFolder(project, folder) {
  const key = `${project}/${folder}`
  expandedFolder.value = expandedFolder.value === key ? null : key
}

function openDocument(project, folder, file) {
  const path = `projects/${project}/${folder}/${file}`
  emit('openDoc', path)
}

function startNewDoc(project, folder, fileType = 'md') {
  newDocContext.value = { project, folder, fileType }
  showNewDocInput.value = true
  newDocName.value = ''
}

function createNewDoc() {
  if (!newDocName.value.trim() || !newDocContext.value) return
  
  let filename = newDocName.value.trim()
  const ext = newDocContext.value.fileType || 'md'
  
  // Add extension if not present
  if (!filename.includes('.')) {
    filename += '.' + ext
  }
  
  const path = `projects/${newDocContext.value.project}/${newDocContext.value.folder}/${filename}`
  emit('newDoc', path, ext)
  
  showNewDocInput.value = false
  newDocContext.value = null
  newDocName.value = ''
  
  // Reload projects to show new file
  setTimeout(loadProjects, 500)
}

function cancelNewDoc() {
  showNewDocInput.value = false
  newDocContext.value = null
  newDocName.value = ''
}

// Rename document
function startRename(project, folder, file) {
  renameContext.value = { project, folder, file }
  renameValue.value = file
}

async function doRename() {
  if (!renameContext.value || !renameValue.value.trim()) return
  
  const { project, folder, file } = renameContext.value
  let newName = renameValue.value.trim()
  if (!newName.endsWith('.md') && file.endsWith('.md')) {
    newName += '.md'
  }
  
  if (newName === file) {
    cancelRename()
    return
  }
  
  try {
    const oldPath = `projects/${project}/${folder}/${file}`
    const newPath = `projects/${project}/${folder}/${newName}`
    
    const res = await fetch('/api/docs/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath })
    })
    
    if (!res.ok) throw new Error('Failed to rename')
    
    cancelRename()
    await loadProjects()
  } catch (err) {
    console.error('Rename failed:', err)
  }
}

function cancelRename() {
  renameContext.value = null
  renameValue.value = ''
}

// Delete document
async function deleteDoc(project, folder, file) {
  if (!confirm(`Delete "${file}"?`)) return
  
  try {
    const path = `projects/${project}/${folder}/${file}`
    const res = await fetch(`/api/docs?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    })
    
    if (!res.ok) throw new Error('Failed to delete')
    await loadProjects()
  } catch (err) {
    console.error('Delete failed:', err)
  }
}

// Check if file is an image
function isImage(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

// Get thumbnail URL for image
function getThumbnail(project, folder, file) {
  const path = `projects/${project}/${folder}/${file}`
  return `/api/files?path=${encodeURIComponent(path)}`
}

// Trigger file upload
function triggerUpload(project, folder) {
  uploadContext.value = { project, folder }
  fileInputRef.value?.click()
}

// Handle file selection
async function handleFileUpload(event) {
  const files = event.target.files
  if (!files.length || !uploadContext.value) return
  
  const { project, folder } = uploadContext.value
  const folderPath = `projects/${project}/${folder}`
  
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  
  try {
    const res = await fetch(`/api/upload?folder=${encodeURIComponent(folderPath)}`, {
      method: 'POST',
      body: formData
    })
    
    if (!res.ok) throw new Error('Upload failed')
    
    await loadProjects()
  } catch (err) {
    console.error('Upload failed:', err)
  } finally {
    uploadContext.value = null
    event.target.value = '' // Reset input
  }
}

// View image in new tab or emit for viewer
function viewImage(project, folder, file) {
  const path = `projects/${project}/${folder}/${file}`
  const url = `/api/files?path=${encodeURIComponent(path)}`
  window.open(url, '_blank')
}

const folderIcons = {
  docs: '📝',
  marketing: '📢',
  assets: '🎨'
}
</script>

<template>
  <input 
    type="file" 
    ref="fileInputRef" 
    @change="handleFileUpload" 
    multiple 
    accept="image/*,.pdf,.zip"
    style="display: none"
  />
  <div class="documents">
    <div class="docs-header">
      <span class="docs-icon">📁</span>
      <span class="docs-title">Projects</span>
    </div>

    <div v-if="loading" class="docs-loading">Loading...</div>
    
    <div v-else class="docs-tree">
      <div 
        v-for="project in projects" 
        :key="project.name"
        class="docs-project"
      >
        <div 
          class="docs-project-header"
          @click="toggleProject(project.name)"
        >
          <span class="docs-expand">{{ expandedProject === project.name ? '▼' : '▶' }}</span>
          <span class="docs-project-name">{{ project.name }}</span>
        </div>
        
        <Transition name="expand">
          <div v-if="expandedProject === project.name" class="docs-folders">
            <div 
              v-for="folder in project.folders" 
              :key="folder.name"
              class="docs-folder"
            >
              <div 
                class="docs-folder-header"
                @click="toggleFolder(project.name, folder.name)"
              >
                <span class="docs-expand">{{ expandedFolder === `${project.name}/${folder.name}` ? '▼' : '▶' }}</span>
                <span class="docs-folder-icon">{{ folderIcons[folder.name] || '📂' }}</span>
                <span class="docs-folder-name">{{ folder.name }}</span>
                <span class="docs-file-count" v-if="folder.files.length">{{ folder.files.length }}</span>
              </div>
              
              <Transition name="expand">
                <div 
                  v-if="expandedFolder === `${project.name}/${folder.name}`" 
                  class="docs-files"
                >
                  <div 
                    v-for="file in folder.files" 
                    :key="file"
                    class="docs-file"
                  >
                    <!-- Rename mode -->
                    <template v-if="renameContext?.project === project.name && renameContext?.folder === folder.name && renameContext?.file === file">
                      <input 
                        v-model="renameValue"
                        @keyup.enter="doRename"
                        @keyup.esc="cancelRename"
                        class="docs-rename-input"
                        autofocus
                      />
                      <button @click="doRename" class="docs-action-btn docs-save">✓</button>
                      <button @click="cancelRename" class="docs-action-btn docs-cancel">✕</button>
                    </template>
                    <!-- Normal mode -->
                    <template v-else>
                      <!-- Image thumbnail -->
                      <template v-if="isImage(file)">
                        <img 
                          :src="getThumbnail(project.name, folder.name, file)" 
                          class="docs-thumbnail"
                          @click="viewImage(project.name, folder.name, file)"
                        />
                        <span class="docs-file-name" @click="viewImage(project.name, folder.name, file)">{{ file }}</span>
                      </template>
                      <!-- Regular file -->
                      <template v-else>
                        <span class="docs-file-icon" @click="openDocument(project.name, folder.name, file)">{{ file.endsWith('.md') ? '📄' : file.endsWith('.html') ? '🌐' : '📎' }}</span>
                        <span class="docs-file-name" @click="openDocument(project.name, folder.name, file)">{{ file }}</span>
                      </template>
                      <div class="docs-file-actions">
                        <button @click.stop="startRename(project.name, folder.name, file)" class="docs-action-btn" title="Rename">✏️</button>
                        <button @click.stop="deleteDoc(project.name, folder.name, file)" class="docs-action-btn docs-delete" title="Delete">🗑️</button>
                      </div>
                    </template>
                  </div>
                  
                  <!-- New document input -->
                  <div 
                    v-if="showNewDocInput && newDocContext?.project === project.name && newDocContext?.folder === folder.name"
                    class="docs-new-input"
                  >
                    <input 
                      v-model="newDocName"
                      @keyup.enter="createNewDoc"
                      @keyup.esc="cancelNewDoc"
                      placeholder="filename.md"
                      class="docs-input"
                      autofocus
                    />
                    <button @click="createNewDoc" class="docs-new-btn">✓</button>
                    <button @click="cancelNewDoc" class="docs-cancel-btn">✕</button>
                  </div>
                  
                  <div class="docs-add-actions">
                    <span 
                      class="docs-add-file"
                      @click="startNewDoc(project.name, folder.name)"
                    >+ .md</span>
                    <span 
                      class="docs-add-file"
                      @click="startNewDoc(project.name, folder.name, 'html')"
                    >+ .html</span>
                    <span 
                      v-if="folder.name === 'assets'"
                      class="docs-add-file docs-upload"
                      @click="triggerUpload(project.name, folder.name)"
                    >📤 Upload</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.documents {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #334155;
}

.docs-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.docs-icon {
  font-size: 1.2rem;
}

.docs-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.95rem;
}

.docs-loading {
  color: #64748b;
  text-align: center;
  padding: 1rem;
}

.docs-tree {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.docs-project-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.docs-project-header:hover {
  background: #334155;
}

.docs-expand {
  color: #64748b;
  font-size: 0.7rem;
  width: 1rem;
}

.docs-project-name {
  color: #e2e8f0;
  font-weight: 500;
}

.docs-folders {
  margin-left: 1rem;
  border-left: 1px solid #334155;
  padding-left: 0.5rem;
}

.docs-folder-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.docs-folder-header:hover {
  background: #334155;
}

.docs-folder-icon {
  font-size: 0.9rem;
}

.docs-folder-name {
  color: #94a3b8;
  font-size: 0.9rem;
}

.docs-file-count {
  color: #64748b;
  font-size: 0.75rem;
  background: #1e293b;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
}

.docs-files {
  margin-left: 1.5rem;
  padding: 0.25rem 0;
}

.docs-file {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.docs-file:hover {
  background: #334155;
}

.docs-file-icon {
  font-size: 0.85rem;
}

.docs-file-name {
  color: #94a3b8;
  font-size: 0.85rem;
  flex: 1;
}

.docs-file-actions {
  display: none;
  gap: 0.2rem;
}

.docs-file:hover .docs-file-actions {
  display: flex;
}

.docs-action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  font-size: 0.75rem;
  border-radius: 3px;
  opacity: 0.6;
}

.docs-action-btn:hover {
  opacity: 1;
  background: #334155;
}

.docs-delete:hover {
  background: #7f1d1d;
}

.docs-save:hover {
  background: #14532d;
}

.docs-cancel:hover {
  background: #7f1d1d;
}

.docs-rename-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #6366f1;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  color: #e2e8f0;
  font-size: 0.8rem;
}

.docs-upload {
  color: #4ade80 !important;
}

.docs-thumbnail {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid #334155;
}

.docs-thumbnail:hover {
  border-color: #6366f1;
}

.docs-add-actions {
  display: flex;
  gap: 0.75rem;
  padding: 0.3rem 0.5rem;
}

.docs-add-file {
  color: #6366f1;
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.docs-add-file:hover {
  opacity: 1;
}

.docs-new-input {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
}

.docs-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #6366f1;
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.docs-input:focus {
  outline: none;
}

.docs-new-btn, .docs-cancel-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-size: 0.9rem;
}

.docs-new-btn:hover {
  color: #4ade80;
}

.docs-cancel-btn:hover {
  color: #ef4444;
}

/* Expand transition */
.expand-enter-active, .expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Mobile */
@media (max-width: 768px) {
  .documents {
    padding: 0.75rem;
  }
  
  .docs-title {
    font-size: 0.9rem;
  }
  
  .docs-project-header {
    padding: 0.4rem;
  }
  
  .docs-project-name {
    font-size: 0.9rem;
  }
  
  .docs-folder-header {
    padding: 0.3rem 0.4rem;
  }
  
  .docs-folder-name {
    font-size: 0.85rem;
  }
  
  .docs-file {
    padding: 0.25rem 0.4rem;
  }
  
  .docs-file-name {
    font-size: 0.8rem;
  }
  
  .docs-thumbnail {
    width: 20px;
    height: 20px;
  }
  
  .docs-add-actions {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .docs-add-file {
    font-size: 0.7rem;
  }
}
</style>
