type HydrationChangeListener = () => void;

const listeners = new Set<HydrationChangeListener>();

export function subscribeHydrationChanges(listener: HydrationChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyHydrationChanged() {
  for (const listener of listeners) {
    listener();
  }
}
