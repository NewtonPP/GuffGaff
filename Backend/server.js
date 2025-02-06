import cors from "cors"
import express from "express"
import { Server } from "socket.io"


const app = express()
app.use(cors())

const io = new Server({cors:true})

app.listen(4000, () => {
    console.log("Server running on port 3000")
})

io.listen(4001)

let queue = []
let users = []
let Rooms = []
const BlackListedUsers = []

let ROOM;
io.on("connection", (socket) =>{
    socket.on("start", () => {
        
        if (queue.includes(socket.id)) {
            socket.emit("error", "You are already in the queue.");
            return;
        }
        users.push(socket)
        queue.push(socket.id)

        if (queue.length >= 2) {
            let id1 = queue.shift()
            let id2 = queue.shift()
            
            const user1 = users.find(x => x.id === id1)
            const user2 = users.find(x => x.id === id2)

            const ROOM_ID = id1+id2
            ROOM = ROOM_ID
            socket.join(ROOM_ID)
            Rooms.push({ROOM_ID, user1, user2})
            
            user1?.emit("createOffer", {ROOM_ID, user2:user2?.id})
            user1?.emit("NewUser")

        }
    })


    socket.on("offer", ({user2, offer})=>{
        const ToSend = users.find(x => x.id === user2)
        ToSend?.emit("offer", ({offer, From:socket.id}))
    })

    socket.on("answer", ({answer, To})=>{
        const ToSend = users.find(x => x.id === To)
        ToSend?.emit("answer", ({answer}))
    })
    
    socket.on("negoNeeded", ({offer, user2}) => {
        const ToSend = users.find(x => x.id === user2)
        ToSend?.emit("negoNeeded", ({offer, From:socket.id}))
    })

    socket.on("negoDone", ({answer, To}) => {
        const ToSend = users.find(x => x.id === To)
        ToSend?.emit("negoFinal", ({answer}))
    })

    socket.on("newMessage", ({sendingMessage, remoteUser}) => {
        const ToSend = users.find(x => x.id === remoteUser)
        ToSend?.emit("newMessage", {sendingMessage, remoteUser})
    })

    socket.on("next",({remoteUser})=>{
  
        const ConnectedUsers = users.filter(x => x.id !== socket.id)
        users = ConnectedUsers

        users.push(socket)
        // queue.push(socket.id)
   
        const ToSend = users.find(x => x.id === remoteUser)
        // const ROOM = Rooms.find(x=> x.user1.id === remoteUser || x.user2.id === remoteUser)
        // queue.push(ROOM.user1.id)
        // queue.push(ROOM.user2.id)
        // ROOM.user1.emit("next")
        ToSend?.emit("next")
    })

    socket.on("end",({remoteUser})=>{
        const ToSend = users.find(x => x.id === remoteUser)
        const ROOM = Rooms.find(x=> x.user1.id === remoteUser || x.user2.id === remoteUser)
        if(ROOM.user1.id === remoteUser){
            queue.push(ROOM.user1.id)
        }else{
            queue.push(ROOM.user2.id)
        }
        
        ToSend?.emit("end")
    })
    // socket.on("disconnect",()=>{
    //     // const ConnectedUsers = users.filter(x => x.id === socket.id)
    //     // users = ConnectedUsers
    //     // BlackListedUsers.push(socket.id)
    //     const DisconnectedRoom = Rooms.find(x => x.ROOM_ID === ROOM) 
    //     if(DisconnectedRoom?.user1?.id === socket.id){
    //         queue.push(DisconnectedRoom?.user2?.id)
    //     }
    //     else{
    //         queue.push(DisconnectedRoom?.user1?.id)
    //     }
    //     socket.broadcast.to(ROOM).emit("disconnected")
    // })
})