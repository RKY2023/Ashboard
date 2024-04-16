'use client';

import { Provider } from 'react-redux';
import store from './index';

export function Providers({ children }) {
  return (
    <Provider store={store}>
      { children }
    </Provider>
  )
}