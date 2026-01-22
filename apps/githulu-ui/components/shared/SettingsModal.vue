<script setup lang="ts">
import { X, Settings, Code, Eye, RefreshCw } from 'lucide-vue-next';

const isVisible = ref(false);

// Settings state (would be persisted via IPC in full implementation)
const settings = reactive({
  editorCommand: 'cursor',
  refreshInterval: 30,
  watchWorkingTree: false,
  showHiddenFiles: false,
});

const editorOptions = [
  { value: 'cursor', label: 'Cursor' },
  { value: 'vscode', label: 'VS Code' },
  { value: 'sublime', label: 'Sublime Text' },
  { value: 'custom', label: 'Custom...' },
];

function open() {
  isVisible.value = true;
}

function close() {
  isVisible.value = false;
}

async function handleSave() {
  // TODO: Save settings via IPC
  close();
}

// Expose open method
defineExpose({ open });
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60"
          @click="close"
        />

        <!-- Dialog -->
        <div class="relative w-full max-w-lg bg-bg-surface border border-bg-hover rounded-lg shadow-xl animate-slide-in">
          <!-- Header -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-bg-hover">
            <div class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Settings class="w-4 h-4 text-primary-400" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Settings</h3>
            <button
              class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400"
              @click="close"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-4 py-4 space-y-6">
            <!-- Editor section -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <Code class="w-4 h-4 text-primary-400" />
                <h4 class="text-sm font-medium text-slate-200">Editor</h4>
              </div>

              <div class="space-y-3 pl-6">
                <div>
                  <label class="block text-sm text-slate-400 mb-1">
                    Default Editor
                  </label>
                  <select
                    v-model="settings.editorCommand"
                    class="w-full px-3 py-2 bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200"
                  >
                    <option
                      v-for="option in editorOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Refresh section -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <RefreshCw class="w-4 h-4 text-primary-400" />
                <h4 class="text-sm font-medium text-slate-200">Auto-refresh</h4>
              </div>

              <div class="space-y-3 pl-6">
                <div>
                  <label class="block text-sm text-slate-400 mb-1">
                    Refresh interval (seconds)
                  </label>
                  <input
                    v-model.number="settings.refreshInterval"
                    type="number"
                    min="5"
                    max="300"
                    class="w-24 px-3 py-2 bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200"
                  />
                </div>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="settings.watchWorkingTree"
                    type="checkbox"
                    class="w-4 h-4 rounded border-bg-hover bg-bg-elevated text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-sm text-slate-300">Watch working tree for changes</span>
                </label>
              </div>
            </div>

            <!-- Display section -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <Eye class="w-4 h-4 text-primary-400" />
                <h4 class="text-sm font-medium text-slate-200">Display</h4>
              </div>

              <div class="space-y-3 pl-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="settings.showHiddenFiles"
                    type="checkbox"
                    class="w-4 h-4 rounded border-bg-hover bg-bg-elevated text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-sm text-slate-300">Show hidden files in file lists</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 px-4 py-3 border-t border-bg-hover">
            <button
              class="px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-sm text-slate-200 rounded-md transition-colors"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-sm text-white rounded-md transition-colors"
              @click="handleSave"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
