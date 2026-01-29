<script setup lang="ts">
import { GitCommit, User, Clock, Tag, GitBranch, ArrowDown } from 'lucide-vue-next';
import type { CommitInfo } from '~/types/githulu';

const props = defineProps<{
  repoId: string;
}>();

const uiStore = useUIStore();

const commits = ref<CommitInfo[]>([]);
const isLoading = ref(false);
const hasMore = ref(false);
const loadCount = ref(50);

// Use the UI store's selectedCommit
const selectedCommit = computed(() => uiStore.selectedCommit);

// Load commits on mount and when repo changes
async function loadCommits() {
  if (!window.githulu) return;
  
  isLoading.value = true;
  try {
    const result = await window.githulu.git.log(props.repoId, loadCount.value, 0);
    commits.value = result.commits;
    hasMore.value = result.hasMore;
  } catch (err) {
    console.error('Failed to load commits:', err);
    uiStore.showToast('Failed to load commit history', 'error');
  } finally {
    isLoading.value = false;
  }
}

async function loadMore() {
  if (!window.githulu || isLoading.value) return;
  
  isLoading.value = true;
  try {
    const result = await window.githulu.git.log(
      props.repoId,
      50,
      commits.value.length
    );
    commits.value.push(...result.commits);
    hasMore.value = result.hasMore;
  } catch (err) {
    console.error('Failed to load more commits:', err);
  } finally {
    isLoading.value = false;
  }
}

function selectCommit(commit: CommitInfo) {
  uiStore.selectCommit(commit);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Group commits by date
const groupedCommits = computed(() => {
  const groups: { date: string; commits: CommitInfo[] }[] = [];
  let currentDate = '';
  
  for (const commit of commits.value) {
    const date = formatDate(commit.date);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, commits: [] });
    }
    groups[groups.length - 1].commits.push(commit);
  }
  
  return groups;
});

// Parse ref badges
function parseRefs(refs: string[]): { type: 'head' | 'branch' | 'tag' | 'remote'; name: string }[] {
  return refs.map((ref) => {
    if (ref.includes('HEAD')) {
      return { type: 'head' as const, name: 'HEAD' };
    }
    if (ref.startsWith('tag:')) {
      return { type: 'tag' as const, name: ref.replace('tag:', '').trim() };
    }
    if (ref.includes('origin/')) {
      return { type: 'remote' as const, name: ref.trim() };
    }
    return { type: 'branch' as const, name: ref.replace('HEAD ->', '').trim() };
  }).filter((r) => r.name && r.name !== 'HEAD');
}

watch(
  () => props.repoId,
  () => {
    commits.value = [];
    uiStore.clearSelectedCommit();
    loadCommits();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Loading state -->
    <div v-if="isLoading && commits.length === 0" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p class="text-sm text-slate-500">Loading history...</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="commits.length === 0" class="flex-1 flex items-center justify-center">
      <div class="text-center text-slate-500">
        <GitCommit class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">No commits yet</p>
      </div>
    </div>

    <!-- Commit list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="group in groupedCommits" :key="group.date">
        <!-- Date header -->
        <div class="sticky top-0 px-4 py-2 text-xs font-medium text-slate-500 bg-bg-base/90 backdrop-blur-sm border-b border-bg-hover">
          {{ group.date }}
        </div>

        <!-- Commits for this date -->
        <div class="divide-y divide-bg-hover">
          <div
            v-for="commit in group.commits"
            :key="commit.hash"
            class="px-4 py-3 hover:bg-bg-hover cursor-pointer transition-colors"
            :class="{ 
              'bg-primary-900/20': selectedCommit?.hash === commit.hash,
              'opacity-50': commit.isUpstream,
            }"
            @click="selectCommit(commit)"
          >
            <div class="flex items-start gap-3">
              <!-- Commit indicator with author avatar placeholder -->
              <div 
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                :class="commit.isUpstream 
                  ? 'bg-teal-900/50 text-teal-400' 
                  : 'bg-primary-900/50 text-primary-400'"
              >
                <ArrowDown v-if="commit.isUpstream" class="w-4 h-4" />
                <template v-else>{{ commit.author.charAt(0).toUpperCase() }}</template>
              </div>

              <div class="flex-1 min-w-0">
                <!-- Subject with ref badges -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm text-slate-200">
                    {{ commit.subject }}
                  </span>
                  
                  <!-- Ref badges -->
                  <template v-for="ref in parseRefs(commit.refs)" :key="ref.name">
                    <span
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium"
                      :class="{
                        'bg-primary-500/20 text-primary-400': ref.type === 'branch',
                        'bg-accent-500/20 text-accent-400': ref.type === 'tag',
                        'bg-teal-500/20 text-teal-400': ref.type === 'remote',
                      }"
                    >
                      <GitBranch v-if="ref.type === 'branch'" class="w-3 h-3" />
                      <Tag v-else-if="ref.type === 'tag'" class="w-3 h-3" />
                      {{ ref.name }}
                    </span>
                  </template>
                </div>

                <!-- Meta -->
                <div class="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span class="font-mono text-primary-400/80">
                    {{ commit.shortHash }}
                  </span>
                  <span class="flex items-center gap-1">
                    <User class="w-3 h-3" />
                    {{ commit.author }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {{ commit.relativeDate }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="p-4">
        <button
          :disabled="isLoading"
          class="w-full py-2 text-sm text-primary-400 hover:bg-bg-hover rounded-md transition-colors disabled:opacity-50"
          @click="loadMore"
        >
          {{ isLoading ? 'Loading...' : 'Load more commits' }}
        </button>
      </div>
    </div>
  </div>
</template>
