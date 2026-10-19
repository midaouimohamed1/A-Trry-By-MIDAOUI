export interface DebounceAsyncOptions {
  /**
   * If true, execute on the leading edge (immediately upon first call),
   * then debounce subsequent calls until the wait window settles.
   * Default: false
   */
  immediate?: boolean;
}

export interface DebouncedAsyncFunction<TArgs extends any[], TResult> {
  (...args: TArgs): Promise<TResult>;
  /** Cancel any pending debounce timer and reject all waiting callers. */
  cancel: (reason?: any) => void;
  /** Immediately execute any pending debounced call without waiting for timeout. */
  flush: () => Promise<TResult | undefined>;
  /** Check if there is an active debounce window or pending execution. */
  isPending: () => boolean;
}

/**
 * Creates a debounced version of an async function.
 * Ensures zero dangling promises by tracking and settling all pending callers in a batch queue.
 */
export function debounceAsync<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult> | TResult,
  wait: number,
  options: DebounceAsyncOptions = {}
): DebouncedAsyncFunction<TArgs, TResult> {
  const { immediate = false } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;
  let lastThis: any = null;
  let hasInvokedImmediateInWindow = false;

  // Dedicated Queue storing resolvers/rejecters for all concurrent callers
  interface PendingItem {
    resolve: (value: TResult | PromiseLike<TResult>) => void;
    reject: (reason?: any) => void;
  }
  let pendingQueue: PendingItem[] = [];

  /**
   * Settles the entire current queue with either a resolved value or rejected error.
   */
  const settleBatch = async (thisContext: any, args: TArgs): Promise<TResult> => {
    // Snapshot the current queue and reset state before async work
    const batchToSettle = pendingQueue;
    pendingQueue = [];
    lastArgs = null;
    lastThis = null;

    try {
      const result = await fn.apply(thisContext, args);
      for (let i = 0; i < batchToSettle.length; i++) {
        batchToSettle[i].resolve(result);
      }
      return result;
    } catch (error) {
      for (let i = 0; i < batchToSettle.length; i++) {
        batchToSettle[i].reject(error);
      }
      throw error;
    }
  };

  const debounced = function (this: any, ...args: TArgs): Promise<TResult> {
    lastArgs = args;
    lastThis = this;

    return new Promise<TResult>((resolve, reject) => {
      // 1. Enqueue caller immediately to guarantee no dangling promises
      pendingQueue.push({ resolve, reject });

      const isFirstCallInWindow = timeoutId === null;

      // 2. Clear any existing timer to debounce the window
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // 3. Set the trailing timer to reset window and execute trailing call if needed
      timeoutId = setTimeout(async () => {
        timeoutId = null;

        if (immediate) {
          // In immediate mode, trailing execution ONLY happens if new calls occurred after the leading call
          if (pendingQueue.length > 0 && lastArgs !== null) {
            await settleBatch(lastThis, lastArgs).catch(() => {});
          }
          hasInvokedImmediateInWindow = false;
        } else {
          // Standard trailing debounce
          if (lastArgs !== null) {
            await settleBatch(lastThis, lastArgs).catch(() => {});
          }
        }
      }, wait);

      // 4. Handle leading-edge (immediate) execution
      if (immediate && isFirstCallInWindow && !hasInvokedImmediateInWindow) {
        hasInvokedImmediateInWindow = true;
        settleBatch(lastThis, lastArgs).catch(() => {});
      }
    });
  };

  /**
   * Cancels the active timer and rejects all pending promises cleanly.
   */
  debounced.cancel = (reason?: any) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    hasInvokedImmediateInWindow = false;
    lastArgs = null;
    lastThis = null;

    const cancelError = reason || new Error('Debounced invocation cancelled.');
    const batch = pendingQueue;
    pendingQueue = [];
    for (let i = 0; i < batch.length; i++) {
      batch[i].reject(cancelError);
    }
  };

  /**
   * Flushes and executes any pending invocation immediately.
   */
  debounced.flush = async (): Promise<TResult | undefined> => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    hasInvokedImmediateInWindow = false;
    if (lastArgs !== null && pendingQueue.length > 0) {
      return await settleBatch(lastThis, lastArgs);
    }
    return undefined;
  };

  debounced.isPending = () => timeoutId !== null;

  return debounced;
}
