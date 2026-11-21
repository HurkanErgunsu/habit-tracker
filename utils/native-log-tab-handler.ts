declare global {
  // eslint-disable-next-line no-var
  var __waterSyncNativeLogTabHandler: (() => void) | undefined;
}

let blocked = false;
let suppressUntil = 0;

/** Used by the expo-router native-tabs patch for the hidden log trigger. */
export function setNativeLogTabBlocked(value: boolean) {
  blocked = value;
}

export function suppressNativeLogTab(ms = 800) {
  suppressUntil = Date.now() + ms;
}

export function setNativeLogTabHandler(handler: (() => void) | null) {
  globalThis.__waterSyncNativeLogTabHandler = handler
    ? () => {
        if (blocked || Date.now() < suppressUntil) {
          return;
        }
        handler();
      }
    : undefined;
}
