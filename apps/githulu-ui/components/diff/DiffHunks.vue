<script setup lang="ts">
import type { DiffHunk } from '~/composables/useDiffParser';

defineProps<{
  hunks: DiffHunk[];
}>();
</script>

<template>
  <div class="overflow-x-auto font-mono text-xs">
    <template v-for="(hunk, hunkIndex) in hunks" :key="hunkIndex">
      <!-- Hunk header -->
      <div class="diff-line-header text-2xs sticky top-0 z-10 px-4 py-1">
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
        <div class="text-2xs flex w-16 flex-shrink-0 select-none text-slate-600">
          <span class="border-bg-hover w-8 border-r px-1 text-right">
            {{ line.oldLineNum ?? '' }}
          </span>
          <span class="border-bg-hover w-8 border-r px-1 text-right">
            {{ line.newLineNum ?? '' }}
          </span>
        </div>

        <!-- Line content -->
        <div class="flex-1 whitespace-pre px-2 py-0.5">
          <span
            :class="[
              line.type === 'addition' && 'text-green-400',
              line.type === 'deletion' && 'text-red-400',
              line.type === 'context' && 'text-slate-300',
            ]"
            >{{ line.content || ' ' }}</span
          >
        </div>
      </div>
    </template>
  </div>
</template>
