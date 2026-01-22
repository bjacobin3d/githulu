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
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Tag class="w-5 h-5 text-accent-400" />
        <h3 class="text-sm font-semibold text-slate-200">Tags</h3>
      </div>
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs bg-accent-600 hover:bg-accent-500 text-white rounded transition-colors"
        disabled
      >
        <Plus class="w-3 h-3" />
        New Tag
      </button>
    </div>

    <div class="text-center py-8 text-slate-500">
      <Tag class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">Tag management coming in Phase 3</p>
      <p class="text-xs text-slate-600 mt-1">Create and manage release tags</p>
    </div>
  </div>
</template>
