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
    const result = await window.githulu.git.log(props.repoId, 50, commits.value.length);
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
  return refs
    .map((ref) => {
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
    })
    .filter((r) => r.name && r.name !== 'HEAD');
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
  <div class="flex h-full flex-col">
    <!-- Loading state -->
    <div v-if="isLoading && commits.length === 0" class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <div
          class="border-primary-500 mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        />
        <p class="text-sm text-slate-500">Loading history...</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="commits.length === 0" class="flex flex-1 items-center justify-center">
      <div class="text-center text-slate-500">
        <GitCommit class="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p class="text-sm">No commits yet</p>
      </div>
    </div>

    <!-- Commit list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="group in groupedCommits" :key="group.date">
        <!-- Date header -->
        <div
          class="bg-bg-base/90 border-bg-hover sticky top-0 border-b px-4 py-2 text-xs font-medium text-slate-500 backdrop-blur-sm"
        >
          {{ group.date }}
        </div>

        <!-- Commits for this date -->
        <div class="divide-bg-hover divide-y">
          <div
            v-for="commit in group.commits"
            :key="commit.hash"
            class="hover:bg-bg-hover cursor-pointer px-4 py-3 transition-colors"
            :class="{
              'bg-primary-900/20': selectedCommit?.hash === commit.hash,
              'opacity-50': commit.isUpstream,
            }"
            @click="selectCommit(commit)"
          >
            <div class="flex items-start gap-3">
              <!-- Commit indicator with author avatar placeholder -->
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
                :class="
                  commit.isUpstream
                    ? 'bg-teal-900/50 text-teal-400'
                    : 'bg-primary-900/50 text-primary-400'
                "
              >
                <ArrowDown v-if="commit.isUpstream" class="h-4 w-4" />
                <template v-else>{{ commit.author.charAt(0).toUpperCase() }}</template>
              </div>

              <div class="min-w-0 flex-1">
                <!-- Subject with ref badges -->
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm text-slate-200">
                    {{ commit.subject }}
                  </span>

                  <!-- Ref badges -->
                  <template v-for="ref in parseRefs(commit.refs)" :key="ref.name">
                    <span
                      class="text-2xs inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
                      :class="{
                        'bg-primary-500/20 text-primary-400': ref.type === 'branch',
                        'bg-accent-500/20 text-accent-400': ref.type === 'tag',
                        'bg-teal-500/20 text-teal-400': ref.type === 'remote',
                      }"
                    >
                      <GitBranch v-if="ref.type === 'branch'" class="h-3 w-3" />
                      <Tag v-else-if="ref.type === 'tag'" class="h-3 w-3" />
                      {{ ref.name }}
                    </span>
                  </template>
                </div>

                <!-- Meta -->
                <div class="mt-1 flex items-center gap-4 text-xs text-slate-500">
                  <span class="text-primary-400/80 font-mono">
                    {{ commit.shortHash }}
                  </span>
                  <span class="flex items-center gap-1">
                    <User class="h-3 w-3" />
                    {{ commit.author }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
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
          class="text-primary-400 hover:bg-bg-hover w-full rounded-md py-2 text-sm transition-colors disabled:opacity-50"
          @click="loadMore"
        >
          {{ isLoading ? 'Loading...' : 'Load more commits' }}
        </button>
      </div>
    </div>
  </div>
</template>
