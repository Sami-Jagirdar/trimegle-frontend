import logo from './../assets/Logo.png'
import { Button } from '../components/ui/button'
import { LogIn } from 'lucide-react';

export default function Login() {
    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/google`;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <img src={logo} alt="Trimegle Logo" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Trimegle</h1>
            <p className="text-muted-foreground mt-2">Connect with two strangers in a private video room</p>
        

            <div className='mt-6 flex flex-col items-center justify-center'>
                <Button
                    onClick={handleGoogleLogin}
                    className='flex items-center space-x-2'
                    size='lg'
                >
                    <LogIn className='w-6 h-6'/>
                    <span>Sign in with Google</span>
                </Button>

                <p className='mt-4 text-center text-xs text-muted-foreground'>
                    By signing in, you confirm that you are over 18 years old and agree to our terms.
                </p>
            </div>
        </div>
    )
}