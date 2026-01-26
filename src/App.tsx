import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import Room from "./pages/Room"
import { MediaProvider } from "./state/MediaContext"
import { PeerConnectionProvider } from "./state/PeerConnectionContext"
import { SocketProvider } from "./state/SocketContext"
import { useAuth } from "./hooks/useAuth"
import Login from "./pages/Login"
import AuthSuccess from "./components/Auth"

function App() {
  const {isAuthenticated, token, loading} = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h2 className="text-xl font-semibold mb-2">
          Loading...
        </h2>
      </div>
    )
  }

  return (
    <Router>
      {isAuthenticated ? (
        <SocketProvider token={token!}>
          <PeerConnectionProvider>
            <MediaProvider>
                <div className="min-h-screen bg-background text-foreground">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/room" element={<Room />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
            </MediaProvider>
          </PeerConnectionProvider>
        </SocketProvider>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  )
}

export default App
