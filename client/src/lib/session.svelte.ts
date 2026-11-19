import {createCall, type Call} from "./call";
import {createSocket, type Socket} from "./socket";
import type {ServerMessage} from "../../../shared/types";
import {refreshStatus, updateStatus} from "./statusMessages";
import {addMessage} from "./chat.svelte";
import {setStream, stopStream} from "./streams.svelte";
import {generateRoomId, setRoomUrl} from "./room";
import {resetChat} from "./chat.svelte";

export const session = $state({
    myId: "",
    username: "",
    usernames: {} as Record<string, string>,
    roomName: "",
    currentRoom: "",
    joined: false,
    serverUp: true,
    connectedToServer: false,
    status: "Connecting to the server... (a free server can take up to a minute " +
                "to wake up)",
    notice: "",
    remoteStreams: [] as {id: string, stream: MediaStream}[],
});

let socket: Socket | undefined;
let call: Call | undefined;
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";

async function onServerMessage(message: ServerMessage)
{
    switch(message.type){
        case "welcome": {
            session.myId = message.id;
            break;
        }
        case "room-not-found": {
            leaveCall();
            session.status = "That room doesn't exist.";
            break;
        }
        case "joined": {
            for(const peer of message.peers)
                session.usernames[peer.id] = peer.name;
            break;
        }
        case "peer-joined": {
            session.usernames[message.id] = message.name;
            break;
        }
        case "peer-left": {
            delete session.usernames[message.id];
            break;
        }
    }

    const newStatus = updateStatus(message);
    if(newStatus) session.status = newStatus;
    await call?.handleMessage(message);
}
function onServerClose(){
    session.serverUp = false;
    session.connectedToServer = false;
    session.notice = session.joined ? "Lost connection to the server. Your call " +
        "continues but nobody can join." : "Could not reach the server. Reload " +
        "the page to try again.";
}

function onRemoteStream(peerId: string, stream: MediaStream | null)
{
    if(stream){
        if(!session.remoteStreams.some((s) => s.id === peerId))
            session.remoteStreams.push({id: peerId, stream: stream});
    }else {
        session.remoteStreams = session.remoteStreams.filter(
            (s) => s.id !== peerId);
    }
    session.status = refreshStatus(session.remoteStreams.length);
}
export function connect(){
    socket = createSocket(WS_URL, onServerMessage, onServerClose,
        () => {session.connectedToServer = true;
                      session.status = "Not in a call"});
    call = createCall(socket, onRemoteStream,
        (peerId, text) => {
            addMessage(peerId, session.usernames[peerId] ?? "Guest", text);
        },
        (peerId) => {
            session.notice = `Could not connect to ${session.usernames[peerId] ?? "a participant"}.`;
        });
}
export function disconnect(){
    call?.close();
    socket?.close();
}


export function sendToPeers(text: string){
    call?.sendMessage(text);
}

export async function joinCall(createRoom: boolean): Promise<boolean>
{
    const room = session.roomName.trim();
    if(!room || !socket || !call || !session.connectedToServer) return false;

    let stream: MediaStream | undefined;
    try{
        stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
    } catch(err){
        session.status = "Could not use the camera or microphone. " +
            "Check the browser permission and that no other app is using them."
    }
    if(!stream) return false;
    setStream(stream);
    call.setLocalStream(stream);

    session.joined = true;
    session.currentRoom = room;
    setRoomUrl(window.location.href, room);
    session.status = "Joining..";

    socket.send({type: "join", room, createRoom, name: session.username});
    session.username = session.username.trim().slice(0, 30) || "Guest";
    return true;
}
export function startCall()
{
    session.roomName = generateRoomId(20);
     return joinCall(true);
}
export function tryJoinCall()
{
    return joinCall(false);
}
export function leaveCall()
{
    socket?.send({type: "leave"});
    call?.close();
    stopStream();
    resetChat();

    session.joined = false;
    session.usernames = {};
    session.currentRoom = "";
    session.roomName = "";
    session.notice = session.serverUp ? "" : "Lost connection to the server. " +
        "Reload the page to reconnect.";
    session.status = "Not in a call.";
}