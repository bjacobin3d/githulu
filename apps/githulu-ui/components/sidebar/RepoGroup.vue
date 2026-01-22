<script setup lang="ts">
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, Pencil } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import type { Group, Repo } from '~/types/githulu';

const props = defineProps<{
  group: Group;
}>();

const reposStore = useReposStore();
const uiStore = useUIStore();

const isCollapsed = ref(false);
const isMenuOpen = ref(false);
const isRenaming = ref(false);
const renameInput = ref(props.group.name);

// Create a local reactive list that syncs with the store
const localRepos = ref<Repo[]>([]);

// Watch for store changes and update local list
watch(
  () => reposStore.getGroupRepos(props.group.id),
  (newRepos) => {
    localRepos.value = [...newRepos];
  },
  { immediate: true, deep: true }
);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function openMenu() {
  isMenuOpen.value = true;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function startRename() {
  isRenaming.value = true;
  renameInput.value = props.group.name;
  closeMenu();
  nextTick(() => {
    const input = document.querySelector(`#rename-${props.group.id}`) as HTMLInputElement;
    input?.focus();
    input?.select();
  });
}

async function submitRename() {
  if (renameInput.value.trim() && renameInput.value !== props.group.name) {
    try {
      await reposStore.renameGroup(props.group.id, renameInput.value.trim());
      uiStore.showToast('Group renamed', 'success');
    } catch (err) {
      uiStore.showToast(
        err instanceof Error ? err.message : 'Failed to rename group',
        'error'
      );
    }
  }
  isRenaming.value = false;
}

function cancelRename() {
  isRenaming.value = false;
  renameInput.value = props.group.name;
}

async function handleDelete() {
  if (reposStore.groups.length <= 1) {
    uiStore.showToast('Cannot delete the last group', 'error');
    closeMenu();
    return;
  }

  try {
    await reposStore.deleteGroup(props.group.id);
    uiStore.showToast('Group deleted', 'success');
  } catch (err) {
    uiStore.showToast(
      err instanceof Error ? err.message : 'Failed to delete group',
      'error'
    );
  }
  closeMenu();
}

// Handle drag and drop events
async function handleDragChange(evt: any) {
  // Handle reordering within the same group
  if (evt.moved) {
    await reposStore.reorderRepo(
      props.group.id,
      evt.moved.oldIndex,
      evt.moved.newIndex
    );
  }
  
  // Handle repo added from another group
  if (evt.added) {
    const repo = evt.added.element as Repo;
    const newIndex = evt.added.newIndex;
    await reposStore.moveRepo(repo.id, props.group.id, newIndex);
  }
}
</script>

<template>
  <div class="mb-2">
    <!-- Group Header -->
    <div
      class="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-bg-hover cursor-pointer group"
      @click="toggleCollapse"
    >
      <component
        :is="isCollapsed ? ChevronRight : ChevronDown"
        class="w-4 h-4 text-slate-500"
      />
      
      <template v-if="isRenaming">
        <input
          :id="`rename-${group.id}`"
          v-model="renameInput"
          type="text"
          class="flex-1 px-1 py-0.5 text-sm bg-bg-elevated border border-primary-500 rounded focus:outline-none text-slate-200"
          @click.stop
          @keyup.enter="submitRename"
          @keyup.escape="cancelRename"
          @blur="submitRename"
        />
      </template>
      <template v-else>
        <span class="flex-1 text-sm font-medium text-slate-300 truncate">
          {{ group.name }}
        </span>
        <span class="text-xs text-slate-500">
          {{ localRepos.length }}
        </span>
      </template>

      <!-- Menu trigger -->
      <button
        class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-elevated transition-opacity"
        @click.stop="openMenu"
      >
        <MoreHorizontal class="w-3.5 h-3.5 text-slate-400" />
      </button>

      <!-- Dropdown menu -->
      <div
        v-if="isMenuOpen"
        class="absolute right-2 mt-24 w-36 bg-bg-elevated border border-bg-hover rounded-md shadow-lg py-1 z-10"
        @click.stop
      >
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-bg-hover"
          @click="startRename"
        >
          <Pencil class="w-3.5 h-3.5" />
          Rename
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-bg-hover"
          @click="handleDelete"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>

    <!-- Close menu when clicking outside -->
    <div
      v-if="isMenuOpen"
      class="fixed inset-0 z-0"
      @click="closeMenu"
    />

    <!-- Repos List -->
    <div v-show="!isCollapsed" class="ml-2">
      <draggable
        v-model="localRepos"
        :group="{ name: 'repos' }"
        item-key="id"
        ghost-class="opacity-50"
        drag-class="drag-active"
        chosen-class="drag-chosen"
        @change="handleDragChange"
      >
        <template #item="{ element }">
          <SidebarRepoItem :repo="element" />
        </template>
      </draggable>
    </div>
  </div>
</template>
