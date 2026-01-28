import { configureStore } from '@reduxjs/toolkit';
import { appReducer, userReducer, trackingReducer } from './slices';

export const store = configureStore({
  reducer: {
    app: appReducer,
    user: userReducer,
    tracking: trackingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
