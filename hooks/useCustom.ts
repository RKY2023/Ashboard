import { useState, Dispatch, SetStateAction } from 'react';

interface UseCustomReturn<T = any> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  setData: Dispatch<SetStateAction<T | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<Error | null>>;
}

export function useCustom<T = any>(): UseCustomReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  return {
    data,
    isLoading,
    error,
    setData,
    setIsLoading,
    setError
  };
}