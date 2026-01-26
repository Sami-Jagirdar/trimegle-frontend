import { useEffect, useState } from "react";

export function useAuth() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        setToken(storedToken);
        setLoading(false);


        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'authToken') {
                setToken(event.newValue);
            }
        }

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [])

    return {
        isAuthenticated: !!token,
        token,
        loading,
    };
}