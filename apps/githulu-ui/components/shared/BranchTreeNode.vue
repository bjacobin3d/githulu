<script setup lang="ts">
import { Folder, GitBranch, Check, ArrowUp, ArrowDown, Circle } from 'lucide-vue-next';
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

const depth = computed(() => props.depth ?? 1);
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
    <SidebarAccordion
      v-if="node.type === 'folder'"
      :model-value="!isCollapsed"
      variant="item"
      :icon="Folder"
      :label="node.name"
      :style="{ paddingLeft }"
      @update:model-value="handleFolderClick"
    >
      <SharedBranchTreeNode
        v-for="child in node.children"
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
    </SidebarAccordion>

    <!-- Branch Node -->
    <SidebarButton
      v-if="node.type === 'branch'"
      :icon="isRemote ? Circle : GitBranch"
      :icon-class="isRemote ? 'h-1.5 w-1.5' : undefined"
      :label="node.name"
      size="xs"
      :selected="node.branch.isCurrent || selectedBranchName === node.branch.name"
      :style="{ paddingLeft }"
      @click="handleBranchClick(node.branch)"
      @dblclick="handleBranchDoubleClick(node.branch)"
      @contextmenu="handleBranchContextMenu($event, node.branch)"
    >
      <!-- Current indicator (only for non-sidebar context) -->
      <template v-if="!currentBranchName" #prefix>
        <div class="w-4 flex-shrink-0">
          <Check v-if="node.branch.isCurrent" class="text-success h-4 w-4" />
        </div>
      </template>

      <template #right>
        <!-- Tracking info (local branches only) -->
        <template v-if="!isRemote && node.branch.upstream">
          <span v-if="node.branch.ahead" class="text-accent-400 flex items-center gap-0.5 text-xs">
            <ArrowUp class="h-3 w-3" />
            {{ node.branch.ahead }}
          </span>
          <span v-if="node.branch.behind" class="flex items-center gap-0.5 text-xs text-teal-400">
            <ArrowDown class="h-3 w-3" />
            {{ node.branch.behind }}
          </span>
        </template>

        <!-- HEAD badge (for sidebar when this is current branch) -->
        <span
          v-if="currentBranchName && node.branch.isCurrent"
          class="text-2xs bg-primary-500/30 text-primary-300 rounded px-1.5 py-0.5"
        >
          HEAD
        </span>
      </template>
    </SidebarButton>
  </div>
</template>
