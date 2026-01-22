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
watch(() => uiStore.showCreateBranchModal, async (visible) => {
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
});

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value || !selectedRepo.value) return;

  isSubmitting.value = true;
  error.value = '';

  const TIMEOUT_MS = 10000; // 10 second timeout
  
  try {
    console.log('[githulu] CreateBranchModal: Starting branch creation');
    
    // Wrap in timeout to prevent infinite hang
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Branch creation timed out. Please try again.')), TIMEOUT_MS);
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
        <div
          class="absolute inset-0 bg-black/60"
          @click="handleClose"
        />

        <!-- Dialog -->
        <div class="relative w-full max-w-sm bg-bg-surface border border-bg-hover rounded-lg shadow-xl animate-slide-in">
          <!-- Header -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-bg-hover">
            <div class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <GitBranch class="w-4 h-4 text-primary-400" />
            </div>
            <h3 class="flex-1 text-lg font-semibold text-slate-100">Create Branch</h3>
            <button
              class="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-slate-400"
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSubmit">
            <div class="px-4 py-4 space-y-4">
              <div>
                <label class="block text-sm text-slate-400 mb-2">
                  Branch Name
                </label>
                <input
                  v-model="branchName"
                  type="text"
                  placeholder="feature/my-feature"
                  class="w-full px-3 py-2 bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200 placeholder-slate-500 font-mono"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-sm text-slate-400 mb-2">
                  Based on
                </label>
                <select
                  v-model="baseBranch"
                  class="w-full px-3 py-2 bg-bg-elevated border border-bg-hover rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-200"
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

              <p v-if="error" class="text-sm text-error">
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
                {{ isSubmitting ? 'Creating...' : 'Create Branch' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
