import { useState } from 'react';

export default function useCustom() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    return {
        data,
        isLoading,
        error,
        setData,
        setIsLoading,
        setError
    };
}