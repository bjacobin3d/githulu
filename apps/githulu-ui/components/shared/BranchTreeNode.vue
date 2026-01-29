<script setup lang="ts">
import {
  Folder,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowUp,
  ArrowDown,
  Circle,
} from 'lucide-vue-next';
import type { BranchTreeNode } from '~/composables/useBranchTree';
import type { BranchInfo } from '~/types/githulu';

const props = defineProps<{
  node: BranchTreeNode;
  repoId: string;
  depth?: number;
  isRemote?: boolean;
  // Branch interaction handlers
  onBranchClick?: (branch: BranchInfo) => void;
  onBranchDoubleClick?: (branch: BranchInfo) => void;
  onBranchContextMenu?: (event: MouseEvent, branch: BranchInfo) => void;
  // UI state
  selectedBranchName?: string | null;
  currentBranchName?: string | null;
}>();

const depth = computed(() => props.depth ?? 0);
const paddingLeft = computed(() => `${depth.value * 16}px`);

// Folder state management
const { isFolderCollapsed, toggleFolder } = useBranchTree(props.repoId);
const isCollapsed = ref(false);

// Initialize collapsed state for folders
if (props.node.type === 'folder') {
  isCollapsed.value = isFolderCollapsed(props.node.fullPath);
}

function handleFolderClick() {
  if (props.node.type === 'folder') {
    isCollapsed.value = toggleFolder(props.node.fullPath);
  }
}

function handleBranchClick(branch: BranchInfo) {
  props.onBranchClick?.(branch);
}

function handleBranchDoubleClick(branch: BranchInfo) {
  props.onBranchDoubleClick?.(branch);
}

function handleBranchContextMenu(event: MouseEvent, branch: BranchInfo) {
  props.onBranchContextMenu?.(event, branch);
}
</script>

<template>
  <div>
    <!-- Folder Node -->
    <button
      v-if="node.type === 'folder'"
      class="w-full flex items-center gap-2 py-1.5 hover:bg-bg-hover cursor-pointer transition-colors text-left"
      :style="{ paddingLeft }"
      @click="handleFolderClick"
    >
      <component
        :is="isCollapsed ? ChevronRight : ChevronDown"
        class="w-3 h-3 text-slate-500 flex-shrink-0"
      />
      <Folder class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span class="text-sm text-slate-300">{{ node.name }}</span>
    </button>

    <!-- Render children if folder is expanded -->
    <div v-if="node.type === 'folder' && !isCollapsed">
      <SharedBranchTreeNode
        v-for="(child, index) in node.children"
        :key="child.type === 'folder' ? child.fullPath : child.branch.name"
        :node="child"
        :repo-id="repoId"
        :depth="depth + 1"
        :is-remote="isRemote"
        :on-branch-click="onBranchClick"
        :on-branch-double-click="onBranchDoubleClick"
        :on-branch-context-menu="onBranchContextMenu"
        :selected-branch-name="selectedBranchName"
        :current-branch-name="currentBranchName"
      />
    </div>

    <!-- Branch Node -->
    <div
      v-if="node.type === 'branch'"
      class="flex items-center gap-2 py-1.5 rounded-md cursor-pointer group transition-colors"
      :class="[
        node.branch.isCurrent
          ? 'bg-primary-900/30 text-primary-300'
          : selectedBranchName === node.branch.name
            ? 'bg-primary-900/20 text-primary-400'
            : 'hover:bg-bg-hover'
      ]"
      :style="{ paddingLeft }"
      @click="handleBranchClick(node.branch)"
      @dblclick="handleBranchDoubleClick(node.branch)"
      @contextmenu="handleBranchContextMenu($event, node.branch)"
    >
      <!-- Current indicator or spacing (only for non-sidebar context) -->
      <div v-if="!currentBranchName" class="w-4 flex-shrink-0">
        <Check
          v-if="node.branch.isCurrent"
          class="w-4 h-4 text-success"
        />
      </div>

      <!-- Branch icon (different for remote) -->
      <component
        :is="isRemote ? Circle : GitBranch"
        class="flex-shrink-0"
        :class="isRemote ? 'w-1.5 h-1.5' : 'w-3 h-3'"
      />

      <!-- Branch name -->
      <span
        class="flex-1 truncate"
        :class="[
          'text-xs',
          node.branch.isCurrent
            ? 'text-primary-300 font-medium'
            : selectedBranchName === node.branch.name
              ? 'text-primary-400'
              : 'text-slate-300'
        ]"
      >
        {{ node.name }}
      </span>

      <!-- HEAD badge (for sidebar when this is current branch) -->
      <span
        v-if="currentBranchName && node.branch.isCurrent"
        class="px-1.5 py-0.5 rounded text-2xs bg-primary-500/30 text-primary-300"
      >
        HEAD
      </span>

      <!-- Tracking info (local branches only, for BranchesView) -->
      <template v-if="!isRemote && node.branch.upstream && !currentBranchName">
        <span
          v-if="node.branch.ahead"
          class="flex items-center gap-0.5 text-xs text-accent-400"
        >
          <ArrowUp class="w-3 h-3" />
          {{ node.branch.ahead }}
        </span>
        <span
          v-if="node.branch.behind"
          class="flex items-center gap-0.5 text-xs text-teal-400"
        >
          <ArrowDown class="w-3 h-3" />
          {{ node.branch.behind }}
        </span>
      </template>
    </div>
  </div>
</template>
