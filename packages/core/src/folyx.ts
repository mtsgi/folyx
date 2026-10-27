import { createBrowserProvider } from "./browser.ts";
import { normalize, sameState } from "./state.ts";
import type { Folyx, FolyxOptions, FolyxSnapshot, ProviderSnapshot } from "./types.ts";

/**
 * Create an independent state reader with lazy, subscription-owned monitoring.
 *
 * Creating an instance does not read browser globals. Reads and subscriptions
 * also work during SSR, with unknown state from the default Browser Provider.
 *
 * @param options - Optional Provider override, such as a Mock or custom Provider.
 * @returns A synchronous snapshot reader and subscription interface.
 */
export function createFolyx(options: FolyxOptions = {}): Folyx {
  const provider = options.provider ?? createBrowserProvider();
  let current: FolyxSnapshot | undefined;
  let stop: (() => void) | undefined;
  let publishing = false;

  // A synchronous read can advance current state without notifying each subscriber.
  const subscriptions = new Set<{
    listener: (s: FolyxSnapshot) => void;
    delivered: FolyxSnapshot;
  }>();

  /** Preserve snapshot identity when observations and metadata have not changed. */
  function update(input: ProviderSnapshot): FolyxSnapshot {
    const next = normalize(input);

    if (!current || !sameState(current, next)) current = next;

    return current;
  }

  const getSnapshot = () => update(provider.getSnapshot());

  /** Release only this Core instance's Provider subscription when it becomes idle. */
  function releaseIfIdle() {
    if (!subscriptions.size) {
      stop?.();
      stop = undefined;
    }
  }

  /** Deliver the latest state without letting reentrant Mock updates regress it. */
  function publish(input: ProviderSnapshot) {
    update(input);

    if (publishing) return;

    publishing = true;

    try {
      let next: FolyxSnapshot;
      do {
        next = current!;

        // oxlint-disable-next-line unicorn/no-useless-spread -- Freeze the dispatch set against subscriptions added by callbacks.
        for (const sub of [...subscriptions]) {
          if (current !== next) break; // A synchronous Mock update must not be followed by older deliveries.
          if (subscriptions.has(sub) && !sameState(sub.delivered, next)) {
            sub.delivered = next;
            sub.listener(next);
          }
        }
      } while (current !== next);
    } finally {
      publishing = false;
    }
  }

  /** Roll back a newly acquired subscription if its first synchronous read fails. */
  function readForSubscription() {
    try {
      return getSnapshot();
    } catch (error) {
      releaseIfIdle();
      throw error;
    }
  }

  return {
    getSnapshot,

    subscribe(listener) {
      if (!stop) stop = provider.subscribe(publish);

      const sub = { listener, delivered: readForSubscription() };
      subscriptions.add(sub);

      try {
        listener(sub.delivered);
      } catch (error) {
        subscriptions.delete(sub);
        releaseIfIdle();
        throw error;
      }

      return () => {
        subscriptions.delete(sub);
        releaseIfIdle();
      };
    },
  };
}
