import { useSyncExternalStore } from "react";

const COARSE_POINTER_QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(COARSE_POINTER_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

/** Touch-first devices where we prefer CSS motion over framer springs/blur. */
export function useCoarsePointer() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
