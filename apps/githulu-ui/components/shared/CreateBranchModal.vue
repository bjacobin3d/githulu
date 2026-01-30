<script setup lang="ts">
import { X, GitBranch } from 'lucide-vue-next';

const uiStore = useUIStore();
const reposStore = useReposStore();
const gitStore = useGitStore();

const branchName = ref('');
const baseBranch = ref('');
const isSubmitting = ref(false);
const error = ref('');

const selectedRepo = computed(() => reposStore.selectedRepo);
const status = computed(() =>
  selectedRepo.value ? gitStore.getStatus(selectedRepo.value.id) : null
);
const branches = computed(() =>
  selectedRepo.value ? gitStore.getBranches(selectedRepo.value.id) : null
);

const isValid = computed(() => branchName.value.trim().length > 0 && baseBranch.value);

// Set default base branch when modal opens
watch(
  () => uiStore.showCreateBranchModal,
  async (visible) => {
    if (visible && selectedRepo.value) {
      branchName.value = '';
      error.value = '';

      // Use the pre-filled base branch from context menu, or default to current branch
      baseBranch.value = uiStore.createBranchBasedOn || status.value?.branch || 'main';

      // Fetch branches if not cached
      if (!branches.value) {
        await gitStore.fetchBranches(selectedRepo.value.id);
      }
    }
  }
);

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value || !selectedRepo.value) return;

  isSubmitting.value = true;
  error.value = '';

  const TIMEOUT_MS = 10000; // 10 second timeout

  try {
    console.log('[githulu] CreateBranchModal: Starting branch creation');

    // Wrap in timeout to prevent infinite hang
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Branch creation timed out. Please try again.')),
        TIMEOUT_MS
      );
    });

    const createPromise = gitStore.createBranch(
      selectedRepo.value.id,
      branchName.value.trim(),
      baseBranch.value
    );

    const result = await Promise.race([createPromise, timeoutPromise]);
    console.log('[githulu] CreateBranchModal: Got result', result);

    if (result?.success) {
      uiStore.closeCreateBranchModal();
      uiStore.showToast(`Created and switched to ${branchName.value}`, 'success');
    } else {
      error.value = result?.stderr || 'Failed to create branch';
    }
  } catch (err) {
    console.error('[githulu] CreateBranchModal: Error', err);
    error.value = err instanceof Error ? err.message : 'Failed to create branch';
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  uiStore.closeCreateBranchModal();
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
        v-if="uiStore.showCreateBranchModal"
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
              <GitBranch class="text-primary-400 h-4 w-4" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Create Branch</h3>
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
                <label class="mb-2 block text-sm text-slate-400"> Branch Name </label>
                <input
                  v-model="branchName"
                  type="text"
                  placeholder="feature/my-feature"
                  class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 font-mono text-slate-200 placeholder-slate-500 focus:ring-1"
                  autofocus
                />
              </div>

              <div>
                <label class="mb-2 block text-sm text-slate-400"> Based on </label>
                <select
                  v-model="baseBranch"
                  class="bg-bg-elevated border-bg-hover focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border px-3 py-2 text-slate-200 focus:ring-1"
                >
                  <optgroup v-if="branches?.local.length" label="Local">
                    <option
                      v-for="branch in branches.local"
                      :key="branch.name"
                      :value="branch.name"
                    >
                      {{ branch.name }}
                    </option>
                  </optgroup>
                  <optgroup v-if="branches?.remote.length" label="Remote">
                    <option
                      v-for="branch in branches.remote"
                      :key="branch.name"
                      :value="branch.name"
                    >
                      {{ branch.name }}
                    </option>
                  </optgroup>
                </select>
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
                {{ isSubmitting ? 'Creating...' : 'Create Branch' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
