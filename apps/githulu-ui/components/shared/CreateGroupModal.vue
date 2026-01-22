<script setup lang="ts">
import { X, FolderPlus } from 'lucide-vue-next';

const uiStore = useUIStore();
const reposStore = useReposStore();

const groupName = ref('');
const isSubmitting = ref(false);
const error = ref('');

const isValid = computed(() => groupName.value.trim().length > 0);

watch(() => uiStore.showCreateGroupModal, (visible) => {
  if (visible) {
    groupName.value = '';
    error.value = '';
  }
});

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  error.value = '';

  try {
    await reposStore.createGroup(groupName.value.trim());
    uiStore.closeCreateGroupModal();
    uiStore.showToast('Group created', 'success');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create group';
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  uiStore.closeCreateGroupModal();
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="uiStore.showCreateGroupModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60"
          @click="handleClose"
        />

        <!-- Dialog -->
        <div class="relative w-full max-w-sm bg-bg-surface border border-bg-hover rounded-lg shadow-xl animate-slide-in">
          <!-- Header -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-bg-hover">
            <div class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <FolderPlus class="w-4 h-4 text-primary-400" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Create Group</h3>
            <button
              class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400"
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSubmit">
            <div class="px-4 py-4">
              <label class="block text-sm text-slate-400 mb-2">
                Group Name
              </label>
              <input
                v-model="groupName"
                type="text"
                placeholder="Enter group name..."
                class="w-full px-3 py-2 bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200 placeholder-slate-500"
                autofocus
              />
              <p v-if="error" class="mt-2 text-sm text-error">
                {{ error }}
              </p>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 px-4 py-3 border-t border-bg-hover">
              <button
                type="button"
                class="px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-sm text-slate-200 rounded-md transition-colors"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!isValid || isSubmitting"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-600/50 disabled:cursor-not-allowed text-sm text-white rounded-md transition-colors"
              >
                {{ isSubmitting ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
