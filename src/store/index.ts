import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { baseApi } from "@/services/api/base-api";

/**
 * Slices are added here as the feature that needs them migrates — see
 * docs/STATE-MANAGEMENT.md. There are none yet: everything migrated so far (interviews,
 * dashboard) is pure server state and lives entirely in `baseApi`'s cache.
 */
export function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

export const store = makeStore();

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
