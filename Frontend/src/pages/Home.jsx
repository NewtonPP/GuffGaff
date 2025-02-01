import React from 'react'
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const navigate = useNavigate()
    const HandleGetStarted = () =>{
        navigate("/chat")
    }
  return (
    <div className='h-screen w-full bg-yellow-600 flex items-center justify-center flex-col gap-4'>
      <h1 className='text-8xl font-bold'>Welcome to GuffGaff</h1>
      <h2 className='text-4xl font-semibold'>Sit, talk, and have fun</h2>
      <button className='bg-orange-600 text-2xl font-semibold p-4 rounded-2xl cursor-pointer hover:bg-orange-700'
      onClick={HandleGetStarted}
      >
        Get Started
      </button>
    </div>
  )
}

export default Home
