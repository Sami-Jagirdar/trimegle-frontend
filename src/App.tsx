import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Room from "./pages/Room"
import { MediaProvider } from "./state/MediaContext"
import { PeerConnectionProvider } from "./state/PeerConnectionContext"

function App() {
  return (
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
  )
}

export default App
