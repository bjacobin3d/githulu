<script setup lang="ts">
const uiStore = useUIStore();

// Local refs that sync with store
const sidebarWidth = computed(() => uiStore.sidebarWidth);
const rightPaneWidth = computed(() => uiStore.rightPaneWidth);

// Resize state
const isResizingLeft = ref(false);
const isResizingRight = ref(false);
const startX = ref(0);
const startWidth = ref(0);

// Left sidebar resize handlers
function startLeftResize(e: MouseEvent) {
  isResizingLeft.value = true;
  startX.value = e.clientX;
  startWidth.value = sidebarWidth.value;
  document.addEventListener('mousemove', handleLeftResize);
  document.addEventListener('mouseup', stopLeftResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function handleLeftResize(e: MouseEvent) {
  if (!isResizingLeft.value) return;
  const diff = e.clientX - startX.value;
  const newWidth = startWidth.value + diff;
  uiStore.setSidebarWidth(newWidth);
}

function stopLeftResize() {
  isResizingLeft.value = false;
  document.removeEventListener('mousemove', handleLeftResize);
  document.removeEventListener('mouseup', stopLeftResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  // Persist to storage
  uiStore.savePreferences();
}

// Right pane resize handlers
function startRightResize(e: MouseEvent) {
  isResizingRight.value = true;
  startX.value = e.clientX;
  startWidth.value = rightPaneWidth.value;
  document.addEventListener('mousemove', handleRightResize);
  document.addEventListener('mouseup', stopRightResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function handleRightResize(e: MouseEvent) {
  if (!isResizingRight.value) return;
  const diff = startX.value - e.clientX;
  const newWidth = startWidth.value + diff;
  uiStore.setRightPaneWidth(newWidth);
}

function stopRightResize() {
  isResizingRight.value = false;
  document.removeEventListener('mousemove', handleRightResize);
  document.removeEventListener('mouseup', stopRightResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  // Persist to storage
  uiStore.savePreferences();
}

// Load preferences on mount
onMounted(() => {
  uiStore.loadPreferences();
});
</script>

<template>
  <div class="h-screen flex flex-col bg-bg-base overflow-hidden">
    <!-- Draggable title bar region for macOS -->
    <div class="window-drag-region h-10 flex-shrink-0 flex items-center">
      <!-- Left spacer for traffic lights -->
      <div class="w-20 flex-shrink-0" />
      <!-- Center area - can show app title if desired -->
      <div class="flex-1" />
    </div>

    <!-- Main content area with 3-pane layout -->
    <div
      class="grid overflow-hidden"
      :style="{ gridTemplateColumns: `${sidebarWidth}px 1fr ${rightPaneWidth}px` }">
      <!-- Left Sidebar -->
      <aside
        class="bg-bg-surface col-start-1 col-end-2 relative overflow-hidden"
      >
        <div class="overflow-auto h-full">
          <slot name="sidebar" />
        </div>
        <!-- Left Resize Handle -->
        <div
            class="resize-handle absolute left-[100%] top-0 bottom-0"
            :class="{ 'resize-handle-active': isResizingLeft }"
            @mousedown="startLeftResize"
          />
      </aside>

      <!-- Center Pane -->
      <main class="bg-bg-base col-start-2 col-end-3 overflow-hidden">
        <div class="overflow-auto h-full">
          <slot />
        </div>
      </main>

      <!-- Right Pane (Diff Viewer) -->
      <aside
        class="bg-bg-surface col-start-3 col-end-4 relative overflow-hidden"
      >
        <div class="overflow-auto h-full">
          <slot name="right-pane" />
        </div>
        <!-- Right Resize Handle -->
        <div
          class="resize-handle absolute right-[100%] top-0 bottom-0"
          :class="{ 'resize-handle-active': isResizingRight }"
          @mousedown="startRightResize"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.resize-handle {
  @apply w-1 h-full cursor-col-resize bg-bg-hover hover:bg-primary-600 transition-colors flex-shrink-0;
}

.resize-handle-active {
  @apply bg-primary-500;
}
</style>
