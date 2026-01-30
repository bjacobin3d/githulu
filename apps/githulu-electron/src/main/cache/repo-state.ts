import type { RepoStatus } from '../../shared/types.js';

/**
 * In-memory cache for repository status
 * This allows the UI to immediately show cached state while fresh data is fetched
 */

const statusCache = new Map<string, RepoStatus>();

/**
 * Get cached status for a repository
 */
export function getRepoStatusCache(repoId: string): RepoStatus | null {
  return statusCache.get(repoId) || null;
}

/**
 * Set cached status for a repository
 */
export function setRepoStatusCache(repoId: string, status: RepoStatus): void {
  statusCache.set(repoId, status);
}

/**
 * Clear cached status for a repository
 */
export function clearRepoStatusCache(repoId: string): void {
  statusCache.delete(repoId);
}

/**
 * Clear all cached status
 */
export function clearAllStatusCache(): void {
  statusCache.clear();
}

/**
 * Check if status cache is stale (older than threshold)
 */
export function isStatusCacheStale(repoId: string, maxAgeMs: number = 30000): boolean {
  const cached = statusCache.get(repoId);
  if (!cached) return true;

  return Date.now() - cached.lastUpdatedAt > maxAgeMs;
}

/**
 * Get all cached repo IDs
 */
export function getCachedRepoIds(): string[] {
  return Array.from(statusCache.keys());
}
