import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Room from "./pages/Room"
import { MediaProvider } from "./state/MediaContext"
import { PeerConnectionProvider } from "./state/PeerConnectionContext"
import { SocketProvider } from "./state/SocketContext"

function App() {
  return (
    <SocketProvider>
      <PeerConnectionProvider>
        <MediaProvider>
          <Router>
            <div className="min-h-screen bg-background text-foreground">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/room/:roomId" element={<Room />} />
              </Routes>
            </div>
          </Router>
        </MediaProvider>
      </PeerConnectionProvider>
    </SocketProvider>
  )
}

export default App
