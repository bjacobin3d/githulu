<script setup lang="ts">
const reposStore = useReposStore();
const gitStore = useGitStore();
const uiStore = useUIStore();

// Initialize event listeners
const { subscribe } = useGithuluEvents();

// Computed: should show bookmarks view
const showBookmarks = computed(() => {
  return uiStore.appView === 'bookmarks' || !reposStore.selectedRepo;
});

// Watch for repo selection to switch views
watch(
  () => reposStore.selectedRepoId,
  (newId) => {
    if (newId) {
      uiStore.enterRepoView();
    }
  }
);

// Initialize on mount
onMounted(async () => {
  await reposStore.loadRepos();

  // Subscribe to events
  subscribe('repoStatusUpdated', (payload: any) => {
    gitStore.updateStatus(payload.repoId, payload.status);
  });

  subscribe('operationProgress', (payload: any) => {
    gitStore.addProgressLine(payload.line);
  });

  subscribe('operationError', (payload: any) => {
    gitStore.addError(payload.repoId, payload.opId, payload.message, payload.details);
  });
});
</script>

<template>
  <!-- Bookmarks View (full screen) -->
  <template v-if="showBookmarks">
    <BookmarksView />
  </template>

  <!-- Repo Detail View (3-pane layout) -->
  <template v-else>
    <NuxtLayout>
      <!-- Sidebar slot - Workspace Sidebar when in repo view -->
      <template #sidebar>
        <SidebarWorkspaceSidebar v-if="reposStore.selectedRepo" :repo="reposStore.selectedRepo" />
      </template>

      <!-- Center content -->
      <template v-if="reposStore.selectedRepo">
        <div class="grid grid-rows-[auto_1fr]">
          <!-- Repo Header -->
          <CenterRepoHeader :repo="reposStore.selectedRepo" />

          <!-- Content based on selected view -->
          <CenterWorkingCopy
            v-if="uiStore.selectedView === 'workingCopy'"
            :repo-id="reposStore.selectedRepo.id"
          />
          <CenterHistoryList
            v-else-if="uiStore.selectedView === 'history'"
            :repo-id="reposStore.selectedRepo.id"
          />
          <CenterBranchesView
            v-else-if="uiStore.selectedView === 'branches'"
            :repo-id="reposStore.selectedRepo.id"
          />
          <CenterStashView
            v-else-if="uiStore.selectedView === 'stashes'"
            :repo-id="reposStore.selectedRepo.id"
          />
        </div>
      </template>

      <!-- Right pane slot -->
      <template #right-pane>
        <!-- Show commit details when viewing history -->
        <DiffCommitDetails
          v-if="uiStore.selectedView === 'history' && reposStore.selectedRepo"
          :repo-id="reposStore.selectedRepo.id"
        />
        <!-- Show diff viewer for working copy and other views -->
        <DiffViewer v-else />
      </template>
    </NuxtLayout>
  </template>

  <!-- Global components -->
  <SharedToast />
  <SharedProgressDrawer />
  <SharedCreateGroupModal />
  <SharedCreateBranchModal />
  <SharedRebaseModal />
  <SharedPushModal />
  <SharedBranchContextMenu />
  <SharedCreateStashModal />
</template>
