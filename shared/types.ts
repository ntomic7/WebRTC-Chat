export type ClientMessage =
    | {type: "join"; room: string, createRoom?: boolean, name: string}
    | {type: "leave";}
    | {type: "offer"; to: string; sdp: string}
    | {type: "answer"; to:string; sdp: string}
    | {type: "candidate"; to:string; candidate: string};

export type ServerMessage =
    | { type: "welcome"; id: string }
    | { type: "joined"; room: string; peers: {id: string; name: string;}[] }
    | { type: "peer-joined"; id: string; name: string; }
    | { type: "peer-left"; id: string }
    | { type: "offer"; from: string; sdp: string }
    | { type: "answer"; from: string; sdp: string }
    | { type: "candidate"; from: string; candidate: string }
    | {type: "room-not-found"; room:string;};