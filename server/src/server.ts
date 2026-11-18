import {startServer} from "./createServer.js";

const port = Number(process.env.PORT) || 8080;

startServer(port).then(() => {
    console.log("signaling server listening on ws://localhost:8080");
});