import { defineStore } from "pinia";
import type { DiffResult, BranchInfo, CommitInfo } from "~/types/githulu";

interface SelectedFile {
  path: string;
  staged: boolean;
  kind: "staged" | "unstaged" | "untracked" | "conflict";
}

interface SelectedBranch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
}

interface UIState {
  appView: "bookmarks" | "repo";
  selectedView: "workingCopy" | "history" | "branches" | "stashes";
  selectedFile: SelectedFile | null;
  selectedBranch: SelectedBranch | null;
  selectedCommit: CommitInfo | null;
  sidebarWidth: number;
  rightPaneWidth: number;
  diffContent: DiffResult | null;
  diffLoading: boolean;
  // Modal states
  showAddRepoModal: boolean;
  showCreateGroupModal: boolean;
  showCreateBranchModal: boolean;
  createBranchBasedOn: string | null;
  showRebaseModal: boolean;
  showPushModal: boolean;
  pushModalBranch: string | null;
  showStashModal: boolean;
  // Context menu state
  branchContextMenu: {
    visible: boolean;
    x: number;
    y: number;
    branch: BranchInfo | null;
    isRemote: boolean;
  };
  // Toast/notification
  toast: {
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  };
}

export const useUIStore = defineStore("ui", {
  state: (): UIState => ({
    appView: "bookmarks",
    selectedView: "workingCopy",
    selectedFile: null,
    selectedBranch: null,
    selectedCommit: null,
    sidebarWidth: 280,
    rightPaneWidth: 400,
    diffContent: null,
    diffLoading: false,
    showAddRepoModal: false,
    showCreateGroupModal: false,
    showCreateBranchModal: false,
    createBranchBasedOn: null,
    showRebaseModal: false,
    showPushModal: false,
    pushModalBranch: null,
    showStashModal: false,
    branchContextMenu: {
      visible: false,
      x: 0,
      y: 0,
      branch: null,
      isRemote: false,
    },
    toast: {
      visible: false,
      message: "",
      type: "info",
    },
  }),

  actions: {
    setAppView(view: "bookmarks" | "repo") {
      this.appView = view;
    },

    enterRepoView() {
      this.appView = "repo";
    },

    exitToBookmarks() {
      this.appView = "bookmarks";
      this.selectedFile = null;
      this.diffContent = null;
    },

    setSelectedView(view: "workingCopy" | "history" | "branches" | "stashes") {
      this.selectedView = view;
    },

    async selectFile(repoId: string, file: SelectedFile | null) {
      console.log("[githulu] selectFile called:", { repoId, file });
      this.selectedFile = file;
      this.diffContent = null;

      if (!file || !window.githulu) {
        console.log("[githulu] No file or no githulu API");
        return;
      }

      // Don't fetch diff for untracked files
      if (file.kind === "untracked") {
        console.log("[githulu] Skipping diff for untracked file");
        return;
      }

      this.diffLoading = true;

      try {
        console.log(
          "[githulu] Fetching diff for:",
          file.path,
          "staged:",
          file.staged
        );
        const diff = await window.githulu.git.diff(
          repoId,
          file.path,
          file.staged
        );
        console.log("[githulu] Got diff result:", diff);
        this.diffContent = diff;
      } catch (err) {
        console.error("[githulu] Failed to fetch diff:", err);
      } finally {
        this.diffLoading = false;
      }
    },

    clearSelectedFile() {
      this.selectedFile = null;
      this.diffContent = null;
    },

    selectCommit(commit: CommitInfo | null) {
      this.selectedCommit = commit;
      // Clear file selection when selecting a commit
      this.selectedFile = null;
      this.diffContent = null;
    },

    clearSelectedCommit() {
      this.selectedCommit = null;
    },

    setSidebarWidth(width: number) {
      this.sidebarWidth = Math.max(0, width);
    },

    setRightPaneWidth(width: number) {
      this.rightPaneWidth = Math.max(0, width);
    },

    // Modal controls
    openAddRepoModal() {
      this.showAddRepoModal = true;
    },

    closeAddRepoModal() {
      this.showAddRepoModal = false;
    },

    openCreateGroupModal() {
      this.showCreateGroupModal = true;
    },

    closeCreateGroupModal() {
      this.showCreateGroupModal = false;
    },

    openCreateBranchModal(basedOn?: string) {
      this.createBranchBasedOn = basedOn || null;
      this.showCreateBranchModal = true;
    },

    closeCreateBranchModal() {
      this.showCreateBranchModal = false;
      this.createBranchBasedOn = null;
    },

    openRebaseModal() {
      this.showRebaseModal = true;
    },

    closeRebaseModal() {
      this.showRebaseModal = false;
    },

    openPushModal(branch: string) {
      this.pushModalBranch = branch;
      this.showPushModal = true;
    },

    closePushModal() {
      this.showPushModal = false;
      this.pushModalBranch = null;
    },

    openStashModal() {
      this.showStashModal = true;
    },

    closeStashModal() {
      this.showStashModal = false;
    },

    // Branch selection (for viewing commits, not switching)
    selectBranch(branch: SelectedBranch | null) {
      this.selectedBranch = branch;
      // When selecting a branch, switch to history view
      if (branch) {
        this.selectedView = "history";
      }
    },

    clearSelectedBranch() {
      this.selectedBranch = null;
    },

    // Branch context menu
    openBranchContextMenu(
      x: number,
      y: number,
      branch: BranchInfo,
      isRemote: boolean
    ) {
      this.branchContextMenu = {
        visible: true,
        x,
        y,
        branch,
        isRemote,
      };
    },

    closeBranchContextMenu() {
      this.branchContextMenu.visible = false;
    },

    // Toast notifications
    showToast(message: string, type: "success" | "error" | "info" = "info") {
      this.toast = {
        visible: true,
        message,
        type,
      };

      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.hideToast();
      }, 3000);
    },

    hideToast() {
      this.toast.visible = false;
    },

    // Persistence
    async savePreferences() {
      if (!window.githulu) return;

      try {
        await window.githulu.ui.savePreferences({
          sidebarWidth: this.sidebarWidth,
          rightPaneWidth: this.rightPaneWidth,
        });
      } catch (err) {
        console.error("[githulu] Failed to save preferences:", err);
      }
    },

    async loadPreferences() {
      if (!window.githulu) return;

      try {
        const prefs = await window.githulu.ui.loadPreferences();
        if (prefs) {
          if (prefs.sidebarWidth) this.sidebarWidth = prefs.sidebarWidth;
          if (prefs.rightPaneWidth) this.rightPaneWidth = prefs.rightPaneWidth;
        }
      } catch (err) {
        console.error("[githulu] Failed to load preferences:", err);
      }
    },
  },
});
