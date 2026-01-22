<script setup lang="ts">
import { User, Clock, GitCommit } from 'lucide-vue-next';

const props = defineProps<{
  repoId: string;
  filePath: string;
}>();

// Phase 3: Blame view placeholder
interface BlameLine {
  lineNumber: number;
  content: string;
  commit: string;
  author: string;
  date: string;
}

const blameData = ref<BlameLine[]>([]);
const isLoading = ref(false);

// Would be implemented with:
// - git blame --porcelain <file>
// - Parse output into structured data
// - Display line-by-line with commit info
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="panel-header flex-shrink-0">
      <div class="flex items-center gap-2">
        <User class="w-4 h-4 text-primary-400" />
        <span class="text-sm font-medium text-slate-200">Blame View</span>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center">
      <div class="text-center py-8 text-slate-500">
        <User class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">Blame view coming in Phase 3</p>
        <p class="text-xs text-slate-600 mt-1">See who changed each line and when</p>
      </div>
    </div>
  </div>
</template>
