import type {Socket} from "./socket";
import type {ServerMessage} from "../../../shared/types";

const config: RTCConfiguration = {
    iceServers: [{urls: "stun:stun.l.google.com:19302"}],
};

export type Call = {
    setLocalStream: (stream: MediaStream) => void;
    handleMessage: (message: ServerMessage) => Promise<void>;
    sendMessage: (text:string) => void;
    close: () => void;
};

export function createCall(socket: Socket, onRemoteStream:
    (peerId: string, stream: MediaStream | null) => void,
     onChatMessage: (peerId: string, text: string)=> void,
     onPeerFailed: (peerId: string) => void): Call
{
    const connections = new Map<string, RTCPeerConnection>();
    let localStream: MediaStream | undefined;

    const chatChannels = new Map<string, RTCDataChannel>();
    function setUpChannel(peerId: string, channel: RTCDataChannel): void {
        chatChannels.set(peerId, channel);
        // message received
        channel.onmessage = (event) => {
            onChatMessage(peerId, event.data);
        };
    }


    function closePeer(id: string){
        const conn = connections.get(id);
        if(!conn) return;

        conn.close()
        connections.delete(id);
        chatChannels.delete(id);
        onRemoteStream(id, null);
    }
    function close(){
        for (const id of [...connections.keys()])
            closePeer(id);
    }
    function sendMessage(text: string){
        for(const [id, channel] of chatChannels){
            if(channel.readyState === "open") channel.send(text);
        }
    }

    function createPeerConnection(peerId: string){
        if(!localStream) throw new Error("local stream not set");
        closePeer(peerId);

        const newConnection = new RTCPeerConnection(config);
        connections.set(peerId, newConnection);

        for(const track of localStream.getTracks()){
            newConnection.addTrack(track, localStream);
        }

        // browser found  possible network path
        newConnection.onicecandidate = (event) => {
            if(event.candidate){
                socket.send({type: "candidate", to:peerId,
                    candidate: JSON.stringify(event.candidate)});
            }
        };
        // peer media arrived
        newConnection.ontrack = (event) => {
            onRemoteStream(peerId, event.streams[0]);
        };
        // peer created data channel
        newConnection.ondatachannel = (event) => {
            setUpChannel(peerId, event.channel);
        };
        newConnection.onconnectionstatechange = () => {
            if(connections.get(peerId) !== newConnection) return;
            if(newConnection.connectionState === "failed"){
                closePeer(peerId);
                onPeerFailed(peerId);
            }
        }
        return newConnection;
    }
    async function handleMessage(message: ServerMessage){
        switch(message.type){
            case "joined": {
                for(const peer of message.peers) {
                    const connection = createPeerConnection(peer.id);
                    setUpChannel(peer.id, connection.createDataChannel("chat"));

                    const offer = await connection.createOffer();
                    await connection.setLocalDescription(offer);
                    socket.send({type: "offer", to: peer.id, sdp: offer.sdp ?? ""});
                }
                break;
            }
            case "offer": {
                const conn = createPeerConnection(message.from);
                await conn.setRemoteDescription({type: "offer", sdp: message.sdp});

                const answer = await conn.createAnswer();
                await conn.setLocalDescription(answer);
                socket.send({type: "answer", to: message.from, sdp: answer.sdp ?? ""});
                break;
            }
            case "answer":{
                await connections.get(message.from)?.setRemoteDescription(
                    {type: "answer", sdp: message.sdp});
                break;
            }
            case "candidate": {
                await connections.get(message.from)?.addIceCandidate(
                    JSON.parse(message.candidate));
                break;
            }
            case "peer-left": {
                closePeer(message.id);
                break;
            }
        }
    }

    return {
        setLocalStream: (stream) => {localStream = stream;},
        handleMessage, sendMessage, close,
    };
}