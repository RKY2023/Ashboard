export default const useCustom ({}) => {
    const [data, setData] = useState(null);
    cont [isLoading, setIsLoading] = useState(true);
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