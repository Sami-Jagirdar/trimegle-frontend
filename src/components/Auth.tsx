import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spinner } from "../components/ui/spinner";


export default function Auth() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        // Token received from backend through URL params after successful authentication
        const token = searchParams.get('token');

        if (token) {
            localStorage.setItem('authToken', token);
            console.log('Authentication successful, token stored.');

            setTimeout(() => {
                navigate('/');
            }, 1000);
        } else {
            console.error("No token found");
            window.alert("Authentication failed. Please try again");
            navigate('/login');
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <h2 className="text-xl font-semibold mb-2">
                Authenticating...
                <div className="mt-4">
                    <Spinner />
                </div>
            </h2>
        </div>
    )
}