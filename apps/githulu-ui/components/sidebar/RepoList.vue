<script setup lang="ts">
import { Plus, FolderPlus, Search } from 'lucide-vue-next';

const reposStore = useReposStore();
const uiStore = useUIStore();

// Logo path (relative for file:// protocol compatibility)
const logoSrc = './icon_dark_64x64.png';

const searchQuery = ref('');

const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) {
    return reposStore.groups;
  }

  const query = searchQuery.value.toLowerCase();
  return reposStore.groups.map((group) => ({
    ...group,
    repoIds: group.repoIds.filter((repoId) => {
      const repo = reposStore.getRepoById(repoId);
      return repo?.displayName.toLowerCase().includes(query);
    }),
  })).filter((group) => group.repoIds.length > 0);
});

async function handleAddRepo() {
  try {
    await reposStore.addRepo();
    uiStore.showToast('Repository added successfully', 'success');
  } catch (err) {
    uiStore.showToast(
      err instanceof Error ? err.message : 'Failed to add repository',
      'error'
    );
  }
}

function handleCreateGroup() {
  uiStore.openCreateGroupModal();
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-bg-hover">
      <div class="flex items-center gap-2">
        <img :src="logoSrc" alt="githulu" class="w-6 h-6" />
        <h1 class="text-sm font-semibold text-slate-200">Repositories</h1>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400 hover:text-slate-200"
          title="Add Repository"
          @click="handleAddRepo"
        >
          <Plus class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400 hover:text-slate-200"
          title="Create Group"
          @click="handleCreateGroup"
        >
          <FolderPlus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="px-3 py-2">
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search repositories..."
          class="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200 placeholder-slate-500"
        />
      </div>
    </div>

    <!-- Groups and Repos -->
    <div class="flex-1 overflow-y-auto px-2 py-1">
      <template v-if="reposStore.loading">
        <div class="space-y-2 px-2">
          <div class="skeleton h-8 w-full" />
          <div class="skeleton h-6 w-3/4 ml-4" />
          <div class="skeleton h-6 w-3/4 ml-4" />
          <div class="skeleton h-8 w-full" />
          <div class="skeleton h-6 w-3/4 ml-4" />
        </div>
      </template>
      <template v-else-if="filteredGroups.length === 0 && searchQuery">
        <div class="text-center py-8 text-slate-500 text-sm">
          No repositories match "{{ searchQuery }}"
        </div>
      </template>
      <template v-else-if="reposStore.repos.length === 0">
        <div class="text-center py-8 text-slate-500">
          <div class="text-sm">No repositories yet</div>
          <button
            class="mt-3 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-md transition-colors"
            @click="handleAddRepo"
          >
            Add Repository
          </button>
        </div>
      </template>
      <template v-else>
        <SidebarRepoGroup
          v-for="group in filteredGroups"
          :key="group.id"
          :group="group"
        />
      </template>
    </div>
  </div>
</template>
