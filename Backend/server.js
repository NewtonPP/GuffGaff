import cors from "cors"
import express from "express"
import { Server } from "socket.io"
import http from "http"

const app = express()

app.use(cors({
    origin: "https://guffandgaff.netlify.app/",
    methods: ["GET", "POST"]
  }));
const server = http.createServer(app)

const io = new Server(server, {cors:{
   origin:"https://guffandgaff.netlify.app/",
   methods: ["GET", "POST"],
}})



server.listen(4000, () => {
    console.log("Server running on port 4000")
})

let queue = []
let users = []
let Rooms = []
const BlackListedUsers = []

let ROOM;
io.on("connection", (socket) =>{
    socket.on("start", () => {
        
        if (queue.includes(socket.id)) {
            console.log("error", "You are already in the queue.");
            return;
        }
        users.push(socket)
        queue.push(socket.id)

        console.log(queue)
        if (queue.length >= 2) {
            let id1 = queue.shift()
            let id2 = queue.shift()
            
            const user1 = users.find(x => x.id === id1)
            const user2 = users.find(x => x.id === id2)

            const ROOM_ID = id1+id2
            ROOM = ROOM_ID
            console.log(ROOM)
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

    socket.on("end",({remoteUser})=>{
        if(queue.includes(socket.id)){
           queue =  queue.filter(q => q !== socket.id)
        }
        const ToSend = users.find(x => x.id === remoteUser)
        const ROOM = Rooms.find(x=> x.user1.id === remoteUser || x.user2.id === remoteUser)
        if(!ROOM) return;
        if(ROOM?.user1?.id === remoteUser){
            queue.push(ROOM.user1.id)
        }else{
            queue.push(ROOM.user2.id)
        }

        if (queue.length >= 2) {
            let id1 = queue.shift()
            let id2 = queue.shift()
            
            const user1 = users.find(x => x.id === id1)
            const user2 = users.find(x => x.id === id2)

            const ROOM_ID = id1+id2
            let r
            r = ROOM_ID
            console.log(r)
            socket.join(ROOM_ID)
            Rooms.push({ROOM_ID, user1, user2})
            
            user1?.emit("createOffer", {ROOM_ID, user2:user2?.id})
            user1?.emit("NewUser")

        }
        
        ToSend?.emit("end")
    })

    // socket.on("next", ({ remoteUser }) => {
    //     // Remove the current user from the queue
    //     if (queue.includes(socket.id)) {
    //         queue = queue.filter(q => q !== socket.id);
    //     }
    
    //     // Find the remote user and their room
    //     const ToSend = users.find(x => x.id === remoteUser);
    //     const ROOM = Rooms.find(x => x.user1.id === remoteUser || x.user2.id === remoteUser);
    
    //     // Handle case where room is not found
    //     if (!ROOM) {
    //         console.error("Room not found for remoteUser:", remoteUser);
    //         socket.emit("error", { message: "Room not found" });
    //         return;
    //     }
    
    //     // Add users from the room back to the queue
    //     queue.push(ROOM.user1.id);
    //     queue.push(ROOM.user2.id);
    
    //     // Remove the current user and remote user from the users array
    //     users = users.filter(x => x.id !== socket.id && x.id !== remoteUser);
    
    //     // Add room users back to the users array if they don't already exist
    //     if (!users.some(x => x.id === ROOM.user1.id)) {
    //         users.push(ROOM.user1);
    //     }
    //     if (!users.some(x => x.id === ROOM.user2.id)) {
    //         users.push(ROOM.user2);
    //     }
    
    //     // If there are at least 2 users in the queue, create a new room
    //     if (queue.length >= 2) {
    //         const id1 = queue.shift();
    //         const id2 = queue.shift();
    
    //         const user1 = users.find(x => x.id === id1);
    //         const user2 = users.find(x => x.id === id2);
    
    //         // Handle case where users are not found
    //         if (!user1 || !user2) {
    //             console.error("Users not found in queue:", id1, id2);
    //             return;
    //         }
    
    //         // Generate a unique room ID
    //         const ROOM_ID = `${id1}-${id2}`; // Or use a UUID library
    
    //         // Join the room and emit events
    //         socket.join(ROOM_ID);
    //         Rooms.push({ ROOM_ID, user1, user2 });
    //         user1.emit("createOffer", { ROOM_ID, user2: user2.id });
    //         ToSend?.emit("next");
    //         user1.emit("NewUser");
    //     }
    
    //     // Notify the remote user to proceed
  
    // });

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