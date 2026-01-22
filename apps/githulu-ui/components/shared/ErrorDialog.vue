<script setup lang="ts">
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  title: string;
  message: string;
  details?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const showDetails = ref(false);

function handleClose() {
  showDetails.value = false;
  emit('close');
}
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
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60"
          @click="handleClose"
        />

        <!-- Dialog -->
        <div class="relative w-full max-w-md bg-bg-surface border border-bg-hover rounded-lg shadow-xl animate-slide-in">
          <!-- Header -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-bg-hover">
            <div class="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
              <AlertTriangle class="w-5 h-5 text-error" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-100">{{ title }}</h3>
            </div>
            <button
              class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400"
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-4 py-4">
            <p class="text-sm text-slate-300">{{ message }}</p>

            <!-- Details toggle -->
            <div v-if="details" class="mt-4">
              <button
                class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                @click="showDetails = !showDetails"
              >
                <component
                  :is="showDetails ? ChevronUp : ChevronDown"
                  class="w-3.5 h-3.5"
                />
                {{ showDetails ? 'Hide' : 'Show' }} details
              </button>

              <Transition
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-40"
                leave-active-class="transition-all duration-150"
                leave-from-class="opacity-100 max-h-40"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="showDetails"
                  class="mt-2 p-3 bg-bg-base rounded-md overflow-auto max-h-40"
                >
                  <pre class="text-xs text-slate-400 font-mono whitespace-pre-wrap">{{ details }}</pre>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end px-4 py-3 border-t border-bg-hover">
            <button
              class="px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-sm text-slate-200 rounded-md transition-colors"
              @click="handleClose"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
