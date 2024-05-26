'use client';
import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './dashboardReducer';

const store = configureStore({
    reducer: {
        dashboard: dashboardReducer,
    },
});

export default store;