import {WebSocketServer, WebSocket} from 'ws'
import {randomUUID} from "node:crypto";
import type {AddressInfo} from "node:net";
import {parseClientMessage} from "./validate.js";
import type {ClientMessage, ServerMessage} from "../../shared/types.js";

type Client = {
    id: string;
    name: string;
    socket: WebSocket;
    room?: string | undefined;
}

export type RunningServer = {
    port: number;
    close: () => Promise<void>;
}

function send(socket: WebSocket, message: ServerMessage)
{
    socket.send(JSON.stringify(message));
}

export function startServer(port: number): Promise<RunningServer>
{
    const clients = new Map<string, Client>();
    const roomList = new Set<string>();

    function addRoom(room: string){
        roomList.add(room);
    }
    function removeRoom(room: string){
        roomList.delete(room);
    }
    function roomIdExists(id: string): boolean{
        return roomList.has(id);
    }

    function getPeersInRoom(room: string, myId: string): Client[]
    {
        return [...clients.values()].filter(
            (client) => client.room === room && client.id !== myId
        );
    }

    function leaveRoom(client: Client)
    {
        const room = client.room;
        if(!room) return;

        const peers = getPeersInRoom(room, client.id);
        for(const peer of peers)
            send(peer.socket, {type:"peer-left", id:client.id});
        if(peers.length === 0) removeRoom(room);

        client.room = undefined;
    }

    function handleClientMessage(client: Client, message: ClientMessage)
    {
        switch(message.type){
            case "join": {
                if(!message.createRoom && !roomIdExists(message.room)){
                    send(client.socket, {type: "room-not-found", room: message.room});
                    break;
                }
                client.name = message.name.trim().slice(0, 30) || "Guest";

                leaveRoom(client);
                client.room = message.room;
                addRoom(message.room);

                const peers = getPeersInRoom(client.room, client.id);
                send(client.socket, {type: "joined", room: client.room,
                    peers: peers.map((p) => ({id: p.id, name: p.name})) });

                for(const peer of peers)
                    send(peer.socket, {type: "peer-joined", id: client.id, name: client.name});
                break;
            }
            case "leave": {
                leaveRoom(client);
                break;
            }
            case "offer":
            case "answer":
            case "candidate": {
                const target = clients.get(message.to);
                if(!target || !client.room || target.room !== client.room){
                    return;
                }
                const {to, ...rest} = message;
                send(target.socket, {...rest, from: client.id});
                break;
            }
        }
    }

    const wss = new WebSocketServer({port, maxPayload: 100 * 1024});

    wss.on("connection", (socket) => {
        const client: Client = {id: randomUUID(), name: "Guest", socket: socket};
        clients.set(client.id, client);
        send(socket, {type: "welcome", id: client.id});

        socket.on("message", (data) => {
            const message = parseClientMessage(data.toString());
            if(!message) return;

            try{
                handleClientMessage(client, message);
            } catch(error){
                console.error("error handling message: ", error);
            }
        });

        socket.on("error", console.error);

        socket.on("close", () => {
            leaveRoom(client);
            clients.delete(client.id);
        });
    });

    return new Promise((resolve, reject) => {
        wss.on("error", reject);
        wss.on("listening", () => {
            const address = wss.address() as AddressInfo;
            resolve({
                port: address.port,
                close: () => new Promise<void>((done) => {
                    for(const socket of wss.clients) socket.terminate();
                    wss.close(() => done());
                }),
            });
        });
    });
}