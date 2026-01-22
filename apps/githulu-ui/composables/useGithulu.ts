/**
 * Composable for accessing the window.githulu API
 */

export function useGithulu() {
  const isAvailable = computed(() => typeof window !== 'undefined' && !!window.githulu);

  const repos = computed(() => window.githulu?.repos ?? null);
  const git = computed(() => window.githulu?.git ?? null);
  const events = computed(() => window.githulu?.events ?? null);
  const utils = computed(() => window.githulu?.utils ?? null);

  return {
    isAvailable,
    repos,
    git,
    events,
    utils,
  };
}

/**
 * Composable for subscribing to githulu events
 */
export function useGithuluEvents() {
  const unsubscribers: (() => void)[] = [];

  function subscribe(eventName: string, handler: (payload: unknown) => void) {
    if (!window.githulu?.events) {
      console.warn('[githulu] Events API not available');
      return;
    }

    const unsubscribe = window.githulu.events.on(eventName, handler);
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // Auto-cleanup on component unmount
  onUnmounted(() => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  });

  return {
    subscribe,
  };
}
