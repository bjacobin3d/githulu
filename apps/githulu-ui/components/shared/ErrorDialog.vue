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
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="handleClose" />

        <!-- Dialog -->
        <div
          class="bg-bg-surface border-bg-hover animate-slide-in relative w-full max-w-md rounded-lg border shadow-xl"
        >
          <!-- Header -->
          <div class="border-bg-hover flex items-center gap-3 border-b px-4 py-3">
            <div class="bg-error/20 flex h-10 w-10 items-center justify-center rounded-full">
              <AlertTriangle class="text-error h-5 w-5" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-100">{{ title }}</h3>
            </div>
            <button
              class="hover:bg-bg-hover rounded-md p-1.5 text-slate-400 transition-colors"
              @click="handleClose"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-4 py-4">
            <p class="text-sm text-slate-300">{{ message }}</p>

            <!-- Details toggle -->
            <div v-if="details" class="mt-4">
              <button
                class="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-400"
                @click="showDetails = !showDetails"
              >
                <component :is="showDetails ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
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
                  class="bg-bg-base mt-2 max-h-40 overflow-auto rounded-md p-3"
                >
                  <pre class="whitespace-pre-wrap font-mono text-xs text-slate-400">{{
                    details
                  }}</pre>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-bg-hover flex justify-end border-t px-4 py-3">
            <button
              class="bg-bg-elevated hover:bg-bg-hover rounded-md px-4 py-2 text-sm text-slate-200 transition-colors"
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
