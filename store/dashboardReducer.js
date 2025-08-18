'use client';
import { createSlice } from '@reduxjs/toolkit';

const initialDashboardStore = {
  theme: 'light',
  testing: 'Store slice not working'
};

const dashboardSlice = createSlice({
  name: 'dash',
  initialState: initialDashboardStore,
  reducers: {
    test(state, action) {
      const defaultTestText = 'Store slice working';
      state.testing = defaultTestText;
    },
    toggleTheme( state, action) {
      const bodyElement = document.getElementsByTagName('body')[0];
      if(state.theme == 'light'){
        bodyElement.setAttribute('data-bs-theme','dark');
        state.theme = 'dark';
        localStorage.setItem('theme','dark');
      } else {
        bodyElement.setAttribute('data-bs-theme','light');
        state.theme = 'light';
        localStorage.setItem('theme','light');
      }
    },
    setTheme(state, action) {
      const payload = action.payload;
      const bodyElement = document.getElementsByTagName('body')[0];
      const getTheme = localStorage.getItem('theme');
      if(getTheme === null){
        console.log('tat');
        state.theme = 'light';
        bodyElement.setAttribute('data-bs-theme','light');
        localStorage.setItem('theme','light');        
      }
      if(payload === 'dark') {
        // state.toggleTheme;
      }
    }
  }
});

export const dashboardActions = dashboardSlice.actions;
export default dashboardSlice.reducer;