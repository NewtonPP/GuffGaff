import React, { createContext } from 'react'
import { io } from 'socket.io-client'

export const socketContext = createContext()

const SocketProvider = ({children}) => {
    const socket = io("http://localhost:4001")

  return (
    <socketContext.Provider value={{socket}}>
        {children}
    </socketContext.Provider>
  )
}

export default SocketProvider
