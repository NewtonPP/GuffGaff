import {BrowserRouter, Routes, Route} from "react-router-dom"
import './App.css'
import Chat from "./pages/Chat"
import Home from "./pages/Home"

function App() {
  return (
    <>
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<Home/>}></Route>
        <Route path="/chat" element={<Chat/>}></Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
