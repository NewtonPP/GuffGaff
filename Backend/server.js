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

const queue = []
const users = []
const Rooms = []

io.on("connection", (socket) =>{
    socket.on("start", () => {
        users.push(socket)
        queue.push(socket.id)

        if (queue.length >= 2) {
            const id1 = queue.shift()
            const id2 = queue.shift()

            const user1 = users.find(x => x.id === id1)
            const user2 = users.find(x => x.id === id2)

            const ROOM_ID = user1+user2
            Rooms.push({ROOM_ID, user1, user2})

            user1.emit("createOffer", {ROOM_ID, user2:user2.id})
        }
    })


    socket.on("offer", ({user2, offer})=>{
        const ToSend = users.find(x => x.id === user2)
        ToSend.emit("offer", ({offer, From:socket.id}))
    })

    socket.on("answer", ({answer, To})=>{
        const ToSend = users.find(x => x.id === To)
        ToSend.emit("answer", ({answer}))
    })
    
    socket.on("negoNeeded", ({offer, user2}) => {
        console.log(user2)
        const ToSend = users.find(x => x.id === user2)
        ToSend.emit("negoNeeded", ({offer, From:socket.id}))
    })

    socket.on("negoDone", ({answer, To}) => {
        const ToSend = users.find(x => x.id === To)
        ToSend.emit("negoFinal", ({answer}))
    })

})