import {BrowserRouter, Routes, Route} from "react-router-dom"
import './App.css'
import Chat from "./pages/Chat"

function App() {
  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/chat" element={<Chat/>}></Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
