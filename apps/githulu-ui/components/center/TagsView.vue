<script setup lang="ts">
import { Tag, Plus, Upload } from 'lucide-vue-next';

const props = defineProps<{
  repoId: string;
}>();

// Phase 3: Tags UI placeholder
const tags = ref<Array<{ name: string; commit: string; message?: string }>>([]);
const isLoading = ref(false);

// Would be implemented with:
// - git tag -l
// - git tag <name> [commit]
// - git tag -a <name> -m "message"
// - git push origin <tag>
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Tag class="text-accent-400 h-5 w-5" />
        <h3 class="text-sm font-semibold text-slate-200">Tags</h3>
      </div>
      <button
        class="bg-accent-600 hover:bg-accent-500 flex items-center gap-1 rounded px-2 py-1 text-xs text-white transition-colors"
        disabled
      >
        <Plus class="h-3 w-3" />
        New Tag
      </button>
    </div>

    <div class="py-8 text-center text-slate-500">
      <Tag class="mx-auto mb-3 h-12 w-12 opacity-50" />
      <p class="text-sm">Tag management coming in Phase 3</p>
      <p class="mt-1 text-xs text-slate-600">Create and manage release tags</p>
    </div>
  </div>
</template>
