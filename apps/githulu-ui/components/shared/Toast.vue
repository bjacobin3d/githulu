<script setup lang="ts">
import { X, CheckCircle, AlertCircle, Info } from 'lucide-vue-next';

const uiStore = useUIStore();

const toast = computed(() => uiStore.toast);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: 'bg-success/20 border-success text-success',
  error: 'bg-error/20 border-error text-error',
  info: 'bg-primary-500/20 border-primary-500 text-primary-400',
};
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="toast.visible"
      class="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg"
      :class="colors[toast.type]"
    >
      <component :is="icons[toast.type]" class="w-5 h-5 flex-shrink-0" />
      <span class="text-sm">{{ toast.message }}</span>
      <button
        class="p-1 hover:bg-white/10 rounded transition-colors"
        @click="uiStore.hideToast()"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </Transition>
</template>
