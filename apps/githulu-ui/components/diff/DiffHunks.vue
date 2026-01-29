<script setup lang="ts">
import type { DiffHunk } from '~/composables/useDiffParser';

defineProps<{
  hunks: DiffHunk[];
}>();
</script>

<template>
  <div class="font-mono text-xs overflow-x-auto">
    <template v-for="(hunk, hunkIndex) in hunks" :key="hunkIndex">
      <!-- Hunk header -->
      <div class="diff-line-header px-4 py-1 sticky top-0 z-10 text-2xs">
        {{ hunk.header }}
      </div>

      <!-- Diff lines -->
      <div
        v-for="(line, lineIndex) in hunk.lines"
        :key="`${hunkIndex}-${lineIndex}`"
        class="flex"
        :class="[
          line.type === 'addition' && 'diff-line-addition',
          line.type === 'deletion' && 'diff-line-deletion',
          line.type === 'context' && 'diff-line-context',
        ]"
      >
        <!-- Line numbers -->
        <div class="flex-shrink-0 w-16 flex text-2xs text-slate-600 select-none">
          <span class="w-8 px-1 text-right border-r border-bg-hover">
            {{ line.oldLineNum ?? '' }}
          </span>
          <span class="w-8 px-1 text-right border-r border-bg-hover">
            {{ line.newLineNum ?? '' }}
          </span>
        </div>

        <!-- Line content -->
        <div class="flex-1 px-2 py-0.5 whitespace-pre">
          <span
            :class="[
              line.type === 'addition' && 'text-green-400',
              line.type === 'deletion' && 'text-red-400',
              line.type === 'context' && 'text-slate-300',
            ]"
          >{{ line.content || ' ' }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
