import { configureStore } from '@reduxjs/toolkit';

import financialsReducer from '../features/financials/financialsSlice';
import helloReducer from '../features/hello/helloSlice';

export const store = configureStore({
  reducer: {
    financials: financialsReducer,
    hello: helloReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
