import { Server as SocketIOServer } from "socket.io";
import http from "http";

export const initSocketServer = (server: http.Server) => {
    const io = new SocketIOServer(server);

    io.on("connection", (socket) => {
        console.log("Un user conectat");

        //Listen for 'notification' event from the frontend
        socket.on("notification", (data) => {
            //Broadcast the notification data to all connectes clients (admin dashboard)
            io.emit("newNotification", data);
        });

        socket.on("disconnect", () => {
            console.log("Un utilizator s-a deconectat");
        });
    })

}