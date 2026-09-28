import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

let io;

const initializeSocket = async (server) => {
    io = new Server(server, {
        cors: {
            origin: "*"
        }
    });

    const pubClient = createClient({
        
    rl: "redis://localhost:6379"
    });

    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    io.adapter(
        createAdapter(
            pubClient,
            subClient
        )
    );

    console.log("Socket.IO redis adapter connected")

    io.on("connection", (socket) => {
        console.log("Client connected: ", socket.id);

        socket.on("joinRide", (rideId) => {
            const room = `ride:${rideId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined ${room}`);
        });

        socket.on("disconnected", () => {
            console.log("Client disconnected", socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO is not initialized");
    }

    return io;
};

const emitRideEvent = (rideId, event, data = {}) => {
    const io = getIO();

    io.to(`ride:${rideId}`).emit(event, {rideId, ...data});
}

export { initializeSocket, getIO, emitRideEvent};