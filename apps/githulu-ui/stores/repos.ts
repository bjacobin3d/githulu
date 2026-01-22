import { defineStore } from 'pinia';
import type { Group, Repo, UIState } from '~/types/githulu';

interface ReposState {
  groups: Group[];
  repos: Repo[];
  selectedRepoId: string | null;
  loading: boolean;
  error: string | null;
}

export const useReposStore = defineStore('repos', {
  state: (): ReposState => ({
    groups: [],
    repos: [],
    selectedRepoId: null,
    loading: false,
    error: null,
  }),

  getters: {
    selectedRepo(state): Repo | null {
      if (!state.selectedRepoId) return null;
      return state.repos.find((r) => r.id === state.selectedRepoId) || null;
    },

    reposById(state): Map<string, Repo> {
      return new Map(state.repos.map((r) => [r.id, r]));
    },

    getRepoById(state) {
      return (repoId: string): Repo | undefined => {
        return state.repos.find((r) => r.id === repoId);
      };
    },

    getGroupRepos(state) {
      return (groupId: string): Repo[] => {
        const group = state.groups.find((g) => g.id === groupId);
        if (!group) return [];
        return group.repoIds
          .map((id) => state.repos.find((r) => r.id === id))
          .filter((r): r is Repo => r !== undefined);
      };
    },
  },

  actions: {
    async loadRepos() {
      if (!window.githulu) {
        console.warn('[githulu] API not available');
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const data = await window.githulu.repos.list();
        this.groups = data.groups;
        this.repos = data.repos;
        this.selectedRepoId = data.ui.selectedRepoId;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load repositories';
        console.error('[githulu] Failed to load repos:', err);
      } finally {
        this.loading = false;
      }
    },

    async addRepo() {
      if (!window.githulu) return;

      try {
        // Open folder dialog
        const folderPath = await window.githulu.utils.selectFolder();
        if (!folderPath) return;

        const result = await window.githulu.repos.add(folderPath);

        // Add to local state
        this.repos.push(result.repo);

        // Add to first group if exists
        if (this.groups.length > 0) {
          this.groups[0].repoIds.push(result.repo.id);
        }

        // Select the new repo
        this.selectedRepoId = result.repo.id;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to add repository';
        throw err;
      }
    },

    async removeRepo(repoId: string) {
      if (!window.githulu) return;

      try {
        await window.githulu.repos.remove(repoId);

        // Remove from local state
        this.repos = this.repos.filter((r) => r.id !== repoId);

        // Remove from all groups
        for (const group of this.groups) {
          group.repoIds = group.repoIds.filter((id) => id !== repoId);
        }

        // Clear selection if this repo was selected
        if (this.selectedRepoId === repoId) {
          this.selectedRepoId = null;
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to remove repository';
        throw err;
      }
    },

    async createGroup(name: string) {
      if (!window.githulu) return;

      try {
        const result = await window.githulu.repos.createGroup(name);
        this.groups.push(result.group);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create group';
        throw err;
      }
    },

    async renameGroup(groupId: string, name: string) {
      if (!window.githulu) return;

      try {
        await window.githulu.repos.renameGroup(groupId, name);

        // Update local state
        const group = this.groups.find((g) => g.id === groupId);
        if (group) {
          group.name = name;
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to rename group';
        throw err;
      }
    },

    async deleteGroup(groupId: string) {
      if (!window.githulu) return;

      try {
        await window.githulu.repos.deleteGroup(groupId);

        // Update local state - reload to get accurate state
        await this.loadRepos();
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete group';
        throw err;
      }
    },

    async moveRepo(repoId: string, toGroupId: string, index: number) {
      if (!window.githulu) return;

      try {
        await window.githulu.repos.moveRepo(repoId, toGroupId, index);

        // Update local state
        // Remove from current group
        for (const group of this.groups) {
          const idx = group.repoIds.indexOf(repoId);
          if (idx !== -1) {
            group.repoIds.splice(idx, 1);
            break;
          }
        }

        // Add to target group
        const targetGroup = this.groups.find((g) => g.id === toGroupId);
        if (targetGroup) {
          targetGroup.repoIds.splice(index, 0, repoId);
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to move repository';
        throw err;
      }
    },

    async reorderRepo(groupId: string, fromIndex: number, toIndex: number) {
      if (!window.githulu) return;

      try {
        await window.githulu.repos.reorderRepo(groupId, fromIndex, toIndex);

        // Update local state
        const group = this.groups.find((g) => g.id === groupId);
        if (group) {
          const [repoId] = group.repoIds.splice(fromIndex, 1);
          group.repoIds.splice(toIndex, 0, repoId);
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to reorder repository';
        throw err;
      }
    },

    selectRepo(repoId: string | null) {
      this.selectedRepoId = repoId;
    },

    clearError() {
      this.error = null;
    },
  },
});
