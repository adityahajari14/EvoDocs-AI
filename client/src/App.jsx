import { Routes, Route } from 'react-router-dom'
import ChatPage from './pages/chat/Chatpage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<h1>Home page</h1>} />
      <Route path="/chat" element={<ChatPage />} />
    </Routes>
  )
}

export default App
