let openSheets = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function registerSheetOpen() {
  openSheets += 1;
  notify();
}

export function registerSheetClosed() {
  openSheets = Math.max(0, openSheets - 1);
  if (openSheets === 0) {
    document.body.style.overflow = "";
  }
  notify();
}

export function isAnySheetOpen() {
  return openSheets > 0;
}

export function subscribeSheetOpen(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
