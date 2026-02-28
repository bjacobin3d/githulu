<script setup lang="ts">
import { X, Pencil } from 'lucide-vue-next';

const uiStore = useUIStore();
const reposStore = useReposStore();
const gitStore = useGitStore();

const newName = ref('');
const isSubmitting = ref(false);
const error = ref('');

const selectedRepo = computed(() => reposStore.selectedRepo);
const oldName = computed(() => uiStore.renameBranchName);

const isValid = computed(
  () => newName.value.trim().length > 0 && newName.value.trim() !== oldName.value
);

watch(
  () => uiStore.showRenameBranchModal,
  (visible) => {
    if (visible) {
      newName.value = oldName.value || '';
      error.value = '';

      nextTick(() => {
        const input = document.querySelector<HTMLInputElement>('#rename-branch-input');
        if (input) {
          input.focus();
          input.select();
        }
      });
    }
  }
);

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value || !selectedRepo.value || !oldName.value) return;

  isSubmitting.value = true;
  error.value = '';

  const TIMEOUT_MS = 10000;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Branch rename timed out. Please try again.')), TIMEOUT_MS);
    });

    const renamePromise = gitStore.renameBranch(
      selectedRepo.value.id,
      oldName.value,
      newName.value.trim()
    );

    const result = await Promise.race([renamePromise, timeoutPromise]);

    if (result?.success) {
      uiStore.closeRenameBranchModal();
      uiStore.showToast(`Renamed branch to ${newName.value.trim()}`, 'success');
    } else {
      error.value = result?.stderr || 'Failed to rename branch';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to rename branch';
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  uiStore.closeRenameBranchModal();
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
        v-if="uiStore.showRenameBranchModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="handleClose" />

        <!-- Dialog -->
        <div
          class="bg-bg-surface border-bg-hover animate-slide-in relative w-full max-w-sm rounded-lg border shadow-xl"
        >
          <!-- Header -->
          <div class="border-bg-hover flex items-center gap-3 border-b px-4 py-3">
            <div class="bg-primary-500/20 flex h-8 w-8 items-center justify-center rounded-full">
              <Pencil class="text-primary-400 h-4 w-4" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Rename Branch</h3>
            <button
              class="hover:bg-bg-hover rounded-md p-1.5 text-slate-400 transition-colors"
              @click="handleClose"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSubmit">
            <div class="space-y-4 px-4 py-4">
              <div>
                <label class="mb-2 block text-sm text-slate-400"> New Branch Name </label>
                <input
                  id="rename-branch-input"
                  v-model="newName"
                  type="text"
                  :placeholder="oldName || ''"
                  class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 font-mono text-slate-200 placeholder-slate-500 focus:ring-1"
                />
              </div>

              <p v-if="error" class="text-error text-sm">
                {{ error }}
              </p>
            </div>

            <!-- Footer -->
            <div class="border-bg-hover flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                class="bg-bg-elevated hover:bg-bg-hover rounded-md px-4 py-2 text-sm text-slate-200 transition-colors"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!isValid || isSubmitting"
                class="bg-primary-600 hover:bg-primary-500 disabled:bg-primary-600/50 rounded-md px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Renaming...' : 'Rename Branch' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
