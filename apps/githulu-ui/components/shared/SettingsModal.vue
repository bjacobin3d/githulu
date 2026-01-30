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
      <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="close" />

        <!-- Dialog -->
        <div
          class="bg-bg-surface border-bg-hover animate-slide-in relative w-full max-w-lg rounded-lg border shadow-xl"
        >
          <!-- Header -->
          <div class="border-bg-hover flex items-center gap-3 border-b px-4 py-3">
            <div class="bg-primary-500/20 flex h-8 w-8 items-center justify-center rounded-full">
              <Settings class="text-primary-400 h-4 w-4" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Settings</h3>
            <button
              class="hover:bg-bg-hover rounded-md p-1.5 text-slate-400 transition-colors"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="space-y-6 px-4 py-4">
            <!-- Editor section -->
            <div>
              <div class="mb-3 flex items-center gap-2">
                <Code class="text-primary-400 h-4 w-4" />
                <h4 class="text-sm font-medium text-slate-200">Editor</h4>
              </div>

              <div class="space-y-3 pl-6">
                <div>
                  <label class="mb-1 block text-sm text-slate-400"> Default Editor </label>
                  <select
                    v-model="settings.editorCommand"
                    class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-slate-200 focus:ring-1"
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
              <div class="mb-3 flex items-center gap-2">
                <RefreshCw class="text-primary-400 h-4 w-4" />
                <h4 class="text-sm font-medium text-slate-200">Auto-refresh</h4>
              </div>

              <div class="space-y-3 pl-6">
                <div>
                  <label class="mb-1 block text-sm text-slate-400">
                    Refresh interval (seconds)
                  </label>
                  <input
                    v-model.number="settings.refreshInterval"
                    type="number"
                    min="5"
                    max="300"
                    class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-24 rounded-md border px-3 py-2 text-slate-200 focus:ring-1"
                  />
                </div>

                <label class="flex cursor-pointer items-center gap-2">
                  <input
                    v-model="settings.watchWorkingTree"
                    type="checkbox"
                    class="border-bg-hover bg-bg-elevated text-primary-600 focus:ring-primary-500 h-4 w-4 rounded"
                  />
                  <span class="text-sm text-slate-300">Watch working tree for changes</span>
                </label>
              </div>
            </div>

            <!-- Display section -->
            <div>
              <div class="mb-3 flex items-center gap-2">
                <Eye class="text-primary-400 h-4 w-4" />
                <h4 class="text-sm font-medium text-slate-200">Display</h4>
              </div>

              <div class="space-y-3 pl-6">
                <label class="flex cursor-pointer items-center gap-2">
                  <input
                    v-model="settings.showHiddenFiles"
                    type="checkbox"
                    class="border-bg-hover bg-bg-elevated text-primary-600 focus:ring-primary-500 h-4 w-4 rounded"
                  />
                  <span class="text-sm text-slate-300">Show hidden files in file lists</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-bg-hover flex justify-end gap-2 border-t px-4 py-3">
            <button
              class="bg-bg-elevated hover:bg-bg-hover rounded-md px-4 py-2 text-sm text-slate-200 transition-colors"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="bg-primary-600 hover:bg-primary-500 rounded-md px-4 py-2 text-sm text-white transition-colors"
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
