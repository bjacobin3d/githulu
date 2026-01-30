/**
 * Git Operation Queue
 *
 * Manages git operations with:
 * - Per-repo queues to prevent lock collisions
 * - Priority levels (high for status/diff, medium for fetch/push, low for log/branches)
 * - Global concurrency limit
 */

export type Priority = 'high' | 'medium' | 'low';

interface QueuedOperation<T> {
  id: string;
  repoPath: string;
  priority: Priority;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  createdAt: number;
}

const priorityValues: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// Global concurrency limit
const MAX_CONCURRENT = 3;

// Per-repo queues
const repoQueues = new Map<string, QueuedOperation<unknown>[]>();

// Currently executing operations
const executing = new Set<string>();

// Global operation counter for unique IDs
let operationCounter = 0;

/**
 * Queue a git operation
 */
export function queueOperation<T>(
  repoPath: string,
  priority: Priority,
  execute: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const operation: QueuedOperation<T> = {
      id: `op_${++operationCounter}`,
      repoPath,
      priority,
      execute,
      resolve: resolve as (value: unknown) => void,
      reject,
      createdAt: Date.now(),
    };

    console.log(
      `[githulu:queue] Queuing operation ${operation.id} for ${repoPath} with priority ${priority}`
    );

    // Get or create queue for this repo
    let queue = repoQueues.get(repoPath);
    if (!queue) {
      queue = [];
      repoQueues.set(repoPath, queue);
    }

    // Insert in priority order (higher priority first)
    const insertIndex = queue.findIndex(
      (op) => priorityValues[op.priority] < priorityValues[priority]
    );

    if (insertIndex === -1) {
      queue.push(operation as QueuedOperation<unknown>);
    } else {
      queue.splice(insertIndex, 0, operation as QueuedOperation<unknown>);
    }

    console.log(
      `[githulu:queue] Queue size for ${repoPath}: ${queue.length}, executing: ${executing.size}`
    );

    // Try to process
    processQueues();
  });
}

/**
 * Process queued operations
 */
function processQueues(): void {
  console.log(
    `[githulu:queue] processQueues called, executing: ${executing.size}/${MAX_CONCURRENT}`
  );

  // Check if we can run more operations
  if (executing.size >= MAX_CONCURRENT) {
    console.log(`[githulu:queue] Max concurrent reached`);
    return;
  }

  // Find the highest priority operation across all repos
  let bestOp: QueuedOperation<unknown> | null = null;
  let bestRepoPath: string | null = null;

  for (const [repoPath, queue] of repoQueues) {
    // Skip if this repo already has an operation executing
    const isExecuting = Array.from(executing).some((id) => id.startsWith(`${repoPath}:`));
    if (isExecuting) {
      console.log(`[githulu:queue] Repo ${repoPath} already executing, skipping queue`);
      continue;
    }

    // Get the first (highest priority) operation
    const op = queue[0];
    if (!op) continue;

    if (!bestOp || priorityValues[op.priority] > priorityValues[bestOp.priority]) {
      bestOp = op;
      bestRepoPath = repoPath;
    } else if (
      priorityValues[op.priority] === priorityValues[bestOp.priority] &&
      op.createdAt < bestOp.createdAt
    ) {
      // Same priority, prefer older operation
      bestOp = op;
      bestRepoPath = repoPath;
    }
  }

  if (!bestOp || !bestRepoPath) {
    console.log(`[githulu:queue] No operations to process`);
    return;
  }

  console.log(`[githulu:queue] Starting operation ${bestOp.id} for ${bestRepoPath}`);

  // Remove from queue
  const queue = repoQueues.get(bestRepoPath)!;
  queue.shift();

  // Clean up empty queues
  if (queue.length === 0) {
    repoQueues.delete(bestRepoPath);
  }

  // Execute
  const executionId = `${bestRepoPath}:${bestOp.id}`;
  executing.add(executionId);

  const operation = bestOp;
  operation
    .execute()
    .then((result) => {
      console.log(`[githulu:queue] Operation ${bestOp!.id} completed successfully`);
      operation.resolve(result);
    })
    .catch((error) => {
      console.error(`[githulu:queue] Operation ${bestOp!.id} failed:`, error);
      operation.reject(error instanceof Error ? error : new Error(String(error)));
    })
    .finally(() => {
      executing.delete(executionId);
      console.log(
        `[githulu:queue] Operation ${bestOp!.id} finished, executing now: ${executing.size}`
      );
      // Process more operations
      processQueues();
    });

  // Try to fill remaining slots
  if (executing.size < MAX_CONCURRENT) {
    processQueues();
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  executing: number;
  queued: number;
  byRepo: Map<string, number>;
} {
  const byRepo = new Map<string, number>();

  for (const [repoPath, queue] of repoQueues) {
    byRepo.set(repoPath, queue.length);
  }

  let totalQueued = 0;
  for (const queue of repoQueues.values()) {
    totalQueued += queue.length;
  }

  return {
    executing: executing.size,
    queued: totalQueued,
    byRepo,
  };
}

/**
 * Clear all queued operations for a repo
 */
export function clearRepoQueue(repoPath: string): void {
  const queue = repoQueues.get(repoPath);
  if (queue) {
    for (const op of queue) {
      op.reject(new Error('Operation cancelled'));
    }
    repoQueues.delete(repoPath);
  }
}

/**
 * Clear all queues
 */
export function clearAllQueues(): void {
  for (const [repoPath] of repoQueues) {
    clearRepoQueue(repoPath);
  }
}
