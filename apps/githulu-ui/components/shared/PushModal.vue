<script setup lang="ts">
import { X, ArrowUp, AlertTriangle } from 'lucide-vue-next';

const reposStore = useReposStore();
const gitStore = useGitStore();
const uiStore = useUIStore();

const selectedRepo = computed(() => reposStore.selectedRepo);
const status = computed(() =>
  selectedRepo.value ? gitStore.getStatus(selectedRepo.value.id) : null
);

const isVisible = computed(() => uiStore.showPushModal);
const branch = computed(() => uiStore.pushModalBranch || status.value?.branch || '');

// Form state
const forceWithLease = ref(false);
const isSubmitting = ref(false);
const error = ref('');

// Destination (remote/branch)
const destination = computed(() => `origin/${branch.value}`);

// Reset form when modal opens
watch(isVisible, (visible) => {
  if (visible) {
    forceWithLease.value = false;
    error.value = '';
  }
});

async function handleSubmit() {
  if (!selectedRepo.value || !branch.value || isSubmitting.value) return;

  isSubmitting.value = true;
  error.value = '';

  try {
    const result = await gitStore.pushWithOptions(selectedRepo.value.id, branch.value, {
      forceWithLease: forceWithLease.value,
    });

    if (result?.success) {
      uiStore.closePushModal();
      uiStore.showToast(
        forceWithLease.value
          ? `Force pushed ${branch.value} to origin`
          : `Pushed ${branch.value} to origin`,
        'success'
      );
      // Refresh branches to update ahead/behind counts
      await gitStore.fetchBranches(selectedRepo.value.id);
    } else {
      error.value = result?.stderr || 'Failed to push';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to push';
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  uiStore.closePushModal();
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
      <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="handleClose" />

        <!-- Dialog -->
        <div
          class="bg-bg-surface border-bg-hover animate-slide-in relative w-full max-w-md rounded-lg border shadow-xl"
        >
          <!-- Header -->
          <div class="border-bg-hover flex items-center gap-3 border-b px-4 py-3">
            <div class="bg-accent-500/20 flex h-10 w-10 items-center justify-center rounded-full">
              <ArrowUp class="text-accent-400 h-5 w-5" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-100">Push HEAD</h3>
              <p class="text-xs text-slate-400">
                Pushes commits from your local HEAD branch "{{ branch }}" to the remote.
              </p>
            </div>
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
              <!-- Destination -->
              <div>
                <label class="mb-2 block text-sm text-slate-400"> Destination: </label>
                <div
                  class="bg-bg-elevated border-bg-hover rounded-md border px-3 py-2 font-mono text-sm text-slate-200"
                >
                  {{ destination }}
                </div>
              </div>

              <!-- Options section -->
              <div class="border-bg-hover border-t pt-4">
                <div class="mb-3 text-sm text-slate-400">Options</div>

                <!-- Force Push checkbox -->
                <label class="group flex cursor-pointer items-start gap-3">
                  <input
                    v-model="forceWithLease"
                    type="checkbox"
                    class="bg-bg-elevated text-primary-500 focus:ring-primary-500 mt-1 h-4 w-4 rounded border-slate-500 focus:ring-offset-0"
                  />
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-slate-200 group-hover:text-white">
                        Force Push
                      </span>
                      <AlertTriangle class="text-warning h-3.5 w-3.5" />
                    </div>
                    <p class="mt-0.5 text-xs text-slate-500">
                      Enforces a new history on the remote branch if fast-forward is not possible.
                      This can cause losing commits on the remote – please use with care!
                    </p>
                    <p v-if="forceWithLease" class="mt-1 text-xs text-teal-400">
                      Using --force-with-lease for safer force push.
                    </p>
                  </div>
                </label>
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
                :disabled="isSubmitting"
                class="rounded-md px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                :class="[
                  forceWithLease
                    ? 'bg-warning hover:bg-warning/80'
                    : 'bg-primary-600 hover:bg-primary-500',
                ]"
              >
                {{ isSubmitting ? 'Pushing...' : forceWithLease ? 'Force Push' : 'Push HEAD' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
