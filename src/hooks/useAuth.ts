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
        const handleAuthChange = () => {
            const updatedToken = localStorage.getItem('authToken');
            setToken(updatedToken);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('authChanged', handleAuthChange);


        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('authChanged', handleAuthChange);
        };
    }, [])

    return {
        isAuthenticated: !!token,
        token,
        loading,
    };
}