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
      uiStore.showToast(err instanceof Error ? err.message : 'Failed to rename group', 'error');
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
    uiStore.showToast(err instanceof Error ? err.message : 'Failed to delete group', 'error');
  }
  closeMenu();
}

// Handle drag and drop events
async function handleDragChange(evt: any) {
  // Handle reordering within the same group
  if (evt.moved) {
    await reposStore.reorderRepo(props.group.id, evt.moved.oldIndex, evt.moved.newIndex);
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
      class="hover:bg-bg-hover group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5"
      @click="toggleCollapse"
    >
      <component :is="isCollapsed ? ChevronRight : ChevronDown" class="h-4 w-4 text-slate-500" />

      <template v-if="isRenaming">
        <input
          :id="`rename-${group.id}`"
          v-model="renameInput"
          type="text"
          class="bg-bg-elevated border-primary-500 flex-1 rounded border px-1 py-0.5 text-sm text-slate-200 focus:outline-none"
          @click.stop
          @keyup.enter="submitRename"
          @keyup.escape="cancelRename"
          @blur="submitRename"
        />
      </template>
      <template v-else>
        <span class="flex-1 truncate text-sm font-medium text-slate-300">
          {{ group.name }}
        </span>
        <span class="text-xs text-slate-500">
          {{ localRepos.length }}
        </span>
      </template>

      <!-- Menu trigger -->
      <button
        class="hover:bg-bg-elevated rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
        @click.stop="openMenu"
      >
        <MoreHorizontal class="h-3.5 w-3.5 text-slate-400" />
      </button>

      <!-- Dropdown menu -->
      <div
        v-if="isMenuOpen"
        class="bg-bg-elevated border-bg-hover absolute right-2 z-10 mt-24 w-36 rounded-md border py-1 shadow-lg"
        @click.stop
      >
        <button
          class="hover:bg-bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-300"
          @click="startRename"
        >
          <Pencil class="h-3.5 w-3.5" />
          Rename
        </button>
        <button
          class="text-error hover:bg-bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-sm"
          @click="handleDelete"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>

    <!-- Close menu when clicking outside -->
    <div v-if="isMenuOpen" class="fixed inset-0 z-0" @click="closeMenu" />

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
