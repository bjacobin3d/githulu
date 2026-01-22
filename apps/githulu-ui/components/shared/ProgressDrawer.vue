<script setup lang="ts">
import { X, Loader2, CheckCircle, XCircle } from 'lucide-vue-next';

const gitStore = useGitStore();

const operation = computed(() => gitStore.currentOperation);
const isVisible = computed(() => !!operation.value);
const isCompleted = computed(() => operation.value?.completed ?? false);
const isSuccess = computed(() => operation.value?.success ?? true);

const operationLabels: Record<string, string> = {
  fetch: 'Fetching from remote...',
  push: 'Pushing to remote...',
  publish: 'Publishing branch...',
  rebase: 'Rebasing...',
  'rebase-continue': 'Continuing rebase...',
  pull: 'Pulling from remote...',
  'force-push': 'Force pushing to remote...',
};

const completedLabels: Record<string, string> = {
  fetch: 'Fetch complete',
  push: 'Push complete',
  publish: 'Branch published',
  rebase: 'Rebase complete',
  'rebase-continue': 'Rebase continued',
  pull: 'Pull complete',
  'force-push': 'Force push complete',
};

const label = computed(() => {
  if (!operation.value) return '';
  
  if (isCompleted.value) {
    return completedLabels[operation.value.type] || `${operation.value.type} complete`;
  }
  
  return operationLabels[operation.value.type] || `Running ${operation.value.type}...`;
});

function dismiss() {
  gitStore.clearOperation();
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="isVisible"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-96 bg-bg-surface border rounded-lg shadow-xl overflow-hidden transition-colors"
      :class="[
        isCompleted 
          ? isSuccess 
            ? 'border-success/50' 
            : 'border-error/50'
          : 'border-bg-hover'
      ]"
    >
      <!-- Header -->
      <div 
        class="flex items-center gap-3 px-4 py-3 transition-colors"
        :class="[
          isCompleted
            ? isSuccess
              ? 'bg-success/10'
              : 'bg-error/10'
            : 'bg-bg-elevated'
        ]"
      >
        <!-- Status icon -->
        <template v-if="isCompleted">
          <CheckCircle v-if="isSuccess" class="w-5 h-5 text-success" />
          <XCircle v-else class="w-5 h-5 text-error" />
        </template>
        <Loader2 v-else class="w-5 h-5 text-primary-400 animate-spin" />

        <span 
          class="flex-1 text-sm font-medium"
          :class="[
            isCompleted
              ? isSuccess
                ? 'text-success'
                : 'text-error'
              : 'text-slate-200'
          ]"
        >
          {{ label }}
        </span>

        <!-- Dismiss button (only show when completed) -->
        <button
          v-if="isCompleted"
          class="p-1 rounded hover:bg-bg-hover transition-colors"
          @click="dismiss"
        >
          <X class="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <!-- Progress output (hide when completed) -->
      <div
        v-if="operation?.lines.length && !isCompleted"
        class="max-h-32 overflow-y-auto px-4 py-2 bg-bg-base"
      >
        <div
          v-for="(line, index) in operation.lines.slice(-10)"
          :key="index"
          class="text-xs text-slate-500 font-mono truncate"
        >
          {{ line }}
        </div>
      </div>
    </div>
  </Transition>
</template>
