import { useDispatch, useSelector, useStore, type TypedUseSelectorHook } from "react-redux";

import type { AppDispatch, AppStore, RootState } from "@/store";

/**
 * Always import these instead of the raw react-redux hooks, so the store's types
 * (RootState/AppDispatch) stay attached at every call site. See docs/STATE-MANAGEMENT.md.
 */
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore: () => AppStore = useStore;
