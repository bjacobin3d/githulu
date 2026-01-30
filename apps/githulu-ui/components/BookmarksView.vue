<script setup lang="ts">
import {
  Plus,
  FolderPlus,
  Search,
  GitBranch,
  Circle,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Settings,
} from 'lucide-vue-next';
import draggable from 'vuedraggable';
import type { Repo, Group } from '~/types/githulu';

const reposStore = useReposStore();
const gitStore = useGitStore();
const uiStore = useUIStore();

// Logo path (relative for file:// protocol compatibility)
const logoSrc = './icon_dark_128x128.png';

const searchQuery = ref('');

// Track collapsed groups
const collapsedGroups = ref<Set<string>>(new Set());

function toggleGroup(groupId: string) {
  if (collapsedGroups.value.has(groupId)) {
    collapsedGroups.value.delete(groupId);
  } else {
    collapsedGroups.value.add(groupId);
  }
  collapsedGroups.value = new Set(collapsedGroups.value);
}

const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) {
    return reposStore.groups;
  }

  const query = searchQuery.value.toLowerCase();
  return reposStore.groups
    .map((group) => ({
      ...group,
      repoIds: group.repoIds.filter((repoId) => {
        const repo = reposStore.getRepoById(repoId);
        return repo?.displayName.toLowerCase().includes(query);
      }),
    }))
    .filter((group) => group.repoIds.length > 0);
});

// Get repos for a group as Repo objects (for draggable)
function getGroupRepos(group: Group): Repo[] {
  return group.repoIds
    .map((id) => reposStore.getRepoById(id))
    .filter((r): r is Repo => r !== undefined);
}

function getRepoStatus(repoId: string) {
  return gitStore.getStatus(repoId);
}

function isRepoLoading(repoId: string) {
  return gitStore.isLoading(repoId);
}

async function handleAddRepo() {
  try {
    await reposStore.addRepo();
    uiStore.showToast('Repository added successfully', 'success');
  } catch (err) {
    uiStore.showToast(err instanceof Error ? err.message : 'Failed to add repository', 'error');
  }
}

function handleCreateGroup() {
  uiStore.openCreateGroupModal();
}

function handleSelectRepo(repoId: string) {
  reposStore.selectRepo(repoId);
  // This will trigger the view switch in index.vue
}

// Handle drag and drop events
async function handleDragChange(groupId: string, evt: any) {
  // Handle reordering within the same group
  if (evt.moved) {
    await reposStore.reorderRepo(groupId, evt.moved.oldIndex, evt.moved.newIndex);
  }

  // Handle repo added from another group
  if (evt.added) {
    const repo = evt.added.element as Repo;
    const newIndex = evt.added.newIndex;
    await reposStore.moveRepo(repo.id, groupId, newIndex);
  }
}

// Watch for repos changes and fetch status reactively
// This fixes the race condition where repos might not be loaded when component mounts
watch(
  () => reposStore.repos,
  (repos) => {
    const staleThreshold = 30000; // 30 seconds
    const now = Date.now();

    for (const repo of repos) {
      const status = gitStore.getStatus(repo.id);
      // Fetch if not cached or if stale (older than 30 seconds)
      if (!status || now - status.lastUpdatedAt > staleThreshold) {
        gitStore.fetchStatus(repo.id);
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="bg-bg-base relative flex h-full flex-col overflow-hidden">
    <!-- Eldritch Background Effects -->
    <div class="eldritch-bg">
      <!-- Cosmic particles -->
      <div class="cosmic-particles">
        <div
          v-for="i in 40"
          :key="`particle-${i}`"
          class="particle"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 20}s`,
          }"
        />
      </div>

      <!-- Tentacle-like gradients -->
      <div class="tentacle tentacle-1" />
      <div class="tentacle tentacle-2" />
      <div class="tentacle tentacle-3" />

      <!-- Pulsating void eyes -->
      <div class="void-eye void-eye-1" />
      <div class="void-eye void-eye-2" />

      <!-- Creeping mist -->
      <div class="mist mist-1" />
      <div class="mist mist-2" />
    </div>

    <!-- Content overlay -->
    <div class="relative z-10 flex h-full flex-col">
      <!-- Header -->
      <div
        class="window-drag-region border-bg-hover flex h-12 flex-shrink-0 items-center border-b px-6"
      >
        <!-- Left spacer for traffic lights -->
        <div class="w-16 flex-shrink-0" />

        <div class="flex flex-1 items-center justify-center gap-3">
          <img
            :src="logoSrc"
            alt="githulu"
            class="h-8 w-8 drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]"
          />
          <h1 class="text-lg font-semibold text-slate-100">Repositories</h1>
        </div>

        <!-- Right actions -->
        <div class="window-no-drag flex w-16 flex-shrink-0 justify-end gap-1">
          <button
            class="hover:bg-bg-hover rounded-md p-2 text-slate-400 transition-colors hover:text-slate-200"
            title="Settings"
          >
            <Settings class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Search and Actions -->
      <div class="border-bg-hover flex-shrink-0 border-b px-6 py-4">
        <div class="mx-auto flex max-w-2xl items-center gap-3">
          <!-- Search -->
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search repositories..."
              class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:ring-1"
            />
          </div>

          <!-- Add buttons -->
          <button
            class="bg-primary-600 hover:bg-primary-500 glow-on-hover flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors"
            @click="handleAddRepo"
          >
            <Plus class="h-4 w-4" />
            Add Repository
          </button>
          <button
            class="hover:bg-bg-hover rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-200"
            title="Create Group"
            @click="handleCreateGroup"
          >
            <FolderPlus class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Repository Groups -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="mx-auto max-w-2xl space-y-6">
          <!-- Loading state -->
          <template v-if="reposStore.loading">
            <div class="space-y-4">
              <div class="skeleton h-8 w-32" />
              <div class="ml-4 space-y-2">
                <div class="skeleton h-16 w-full rounded-lg" />
                <div class="skeleton h-16 w-full rounded-lg" />
              </div>
            </div>
          </template>

          <!-- Empty state -->
          <template v-else-if="reposStore.repos.length === 0">
            <div class="py-16 text-center">
              <div class="mx-auto mb-6 h-20 w-20">
                <img
                  :src="logoSrc"
                  alt="githulu"
                  class="h-full w-full drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                />
              </div>
              <h2 class="mb-2 text-xl font-semibold text-slate-100">Welcome to githulu</h2>
              <p class="mx-auto mb-6 max-w-sm text-slate-400">
                Add your first repository to get started with a clean, Tower-like Git workflow.
              </p>
              <button
                class="bg-primary-600 hover:bg-primary-500 glow-on-hover rounded-lg px-6 py-3 text-white transition-colors"
                @click="handleAddRepo"
              >
                Add Repository
              </button>
            </div>
          </template>

          <!-- No search results -->
          <template v-else-if="filteredGroups.length === 0 && searchQuery">
            <div class="py-12 text-center text-slate-500">
              <Search class="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>No repositories match "{{ searchQuery }}"</p>
            </div>
          </template>

          <!-- Groups and Repos -->
          <template v-else>
            <div v-for="group in filteredGroups" :key="group.id" class="space-y-2">
              <!-- Group Header -->
              <button
                class="hover:bg-bg-hover/50 -ml-2 flex w-full items-center gap-2 rounded-md py-2 pl-2 text-left transition-colors"
                @click="toggleGroup(group.id)"
              >
                <component
                  :is="collapsedGroups.has(group.id) ? ChevronRight : ChevronDown"
                  class="h-4 w-4 text-slate-500"
                />
                <span class="text-sm font-semibold text-slate-300">
                  {{ group.name }}
                </span>
                <span class="text-xs text-slate-500">
                  {{ group.repoIds.length }}
                </span>
              </button>

              <!-- Repos in Group (draggable) -->
              <draggable
                v-if="!collapsedGroups.has(group.id)"
                :model-value="getGroupRepos(group)"
                :group="{ name: 'repos', pull: true, put: true }"
                item-key="id"
                ghost-class="opacity-50"
                drag-class="drag-active"
                chosen-class="drag-chosen"
                class="ml-4 min-h-[40px] space-y-2"
                @change="(evt: any) => handleDragChange(group.id, evt)"
              >
                <template #item="{ element: repo }">
                  <div
                    class="bg-bg-surface hover:bg-bg-hover hover:shadow-primary-900/20 group flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-all hover:shadow-lg"
                    @click="handleSelectRepo(repo.id)"
                  >
                    <!-- Repo Icon -->
                    <div
                      class="bg-primary-900/30 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    >
                      <GitBranch class="text-primary-400 h-5 w-5" />
                    </div>

                    <!-- Repo Info -->
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="truncate text-base font-medium text-slate-100">
                          {{ repo.displayName }}
                        </span>

                        <!-- Loading indicator -->
                        <Circle
                          v-if="isRepoLoading(repo.id)"
                          class="text-primary-400 h-3 w-3 animate-pulse"
                        />
                      </div>

                      <!-- Status info -->
                      <div class="mt-1 flex items-center gap-3 text-sm">
                        <template v-if="getRepoStatus(repo.id)">
                          <span class="text-slate-500">
                            {{ getRepoStatus(repo.id)?.branch || 'detached' }}
                          </span>

                          <!-- Ahead/Behind -->
                          <span
                            v-if="getRepoStatus(repo.id)?.ahead ?? 0 > 0"
                            class="text-accent-400 flex items-center gap-1"
                          >
                            <ArrowUp class="h-3 w-3" />
                            {{ getRepoStatus(repo.id)?.ahead }}
                          </span>
                          <span
                            v-if="getRepoStatus(repo.id)?.behind ?? 0 > 0"
                            class="flex items-center gap-1 text-teal-400"
                          >
                            <ArrowDown class="h-3 w-3" />
                            {{ getRepoStatus(repo.id)?.behind }}
                          </span>

                          <!-- Dirty indicator -->
                          <span
                            v-if="getRepoStatus(repo.id)?.isDirty"
                            class="text-warning flex items-center gap-1"
                          >
                            <Circle class="h-2 w-2 fill-current" />
                            uncommitted
                          </span>

                          <!-- Rebase indicator -->
                          <span
                            v-if="getRepoStatus(repo.id)?.rebase.inProgress"
                            class="text-error flex items-center gap-1"
                          >
                            <AlertTriangle class="h-3 w-3" />
                            rebase
                          </span>
                        </template>
                        <span v-else class="text-slate-600"> Loading... </span>
                      </div>
                    </div>

                    <!-- Arrow indicator on hover -->
                    <div class="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <ChevronRight class="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Eldritch background container */
.eldritch-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Cosmic particles */
.cosmic-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.9), transparent);
  border-radius: 50%;
  animation:
    float-particle linear infinite,
    pulse-particle ease-in-out 4s infinite;
  box-shadow:
    0 0 8px rgba(139, 92, 246, 0.6),
    0 0 16px rgba(139, 92, 246, 0.3);
}

@keyframes float-particle {
  0% {
    transform: translateY(100vh) translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-100vh) translateX(30px) scale(0.9);
    opacity: 0;
  }
}

@keyframes pulse-particle {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* Tentacle-like animated gradients */
.tentacle {
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(
    ellipse at center,
    rgba(139, 92, 246, 0.15) 0%,
    rgba(236, 72, 153, 0.1) 30%,
    transparent 70%
  );
  border-radius: 50%;
  filter: blur(60px);
  animation: tentacle-swim 20s ease-in-out infinite;
}

.tentacle-1 {
  top: -10%;
  left: -10%;
  animation-delay: 0s;
  animation-duration: 25s;
}

.tentacle-2 {
  bottom: -15%;
  right: -10%;
  animation-delay: -8s;
  animation-duration: 30s;
}

.tentacle-3 {
  top: 40%;
  left: -15%;
  animation-delay: -15s;
  animation-duration: 35s;
}

@keyframes tentacle-swim {
  0%,
  100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
  }
  33% {
    transform: translate(100px, -50px) scale(1.2) rotate(120deg);
  }
  66% {
    transform: translate(-50px, 100px) scale(0.9) rotate(240deg);
  }
}

/* Void eyes - subtle pulsating glows */
.void-eye {
  position: absolute;
  width: 60px;
  height: 60px;
  background: radial-gradient(
    circle,
    rgba(236, 72, 153, 0.3) 0%,
    rgba(139, 92, 246, 0.2) 40%,
    transparent 70%
  );
  border-radius: 50%;
  filter: blur(20px);
  animation: void-gaze 8s ease-in-out infinite;
}

.void-eye-1 {
  top: 20%;
  right: 15%;
  animation-delay: 0s;
}

.void-eye-2 {
  bottom: 30%;
  left: 20%;
  animation-delay: -4s;
}

@keyframes void-gaze {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

/* Creeping mist */
.mist {
  position: absolute;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 30%, rgba(236, 72, 153, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 80%, rgba(124, 58, 237, 0.07) 0%, transparent 50%);
  animation: mist-drift 40s linear infinite;
}

.mist-1 {
  animation-duration: 50s;
}

.mist-2 {
  animation-duration: 60s;
  animation-delay: -20s;
  opacity: 0.7;
}

@keyframes mist-drift {
  0% {
    transform: translate(-25%, -25%) rotate(0deg);
  }
  100% {
    transform: translate(-25%, -25%) rotate(360deg);
  }
}

/* Ensure content is above effects */
.relative.z-10 {
  background: transparent;
}
</style>
