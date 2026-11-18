import type {ClientMessage} from "../../shared/types.js";

function isObject(value: unknown): value is Record<string, unknown>
{
    return typeof value === "object" && value !== null;
}
function isText(value: unknown, min: number, max: number): value is string
{
    return typeof value === "string" && value.length >= min && value.length <= max;
}

export function parseClientMessage(raw: string): ClientMessage | null
{
    let data: unknown;
    try{
        data = JSON.parse(raw);
    }catch{
        return null;
    }
    if(!isObject(data)) return null;

    const {type, room, name, createRoom, to, sdp, candidate} = data;
    switch(type){
        case "join": {
            if (!isText(room, 1, 100) || !isText(name, 0, 100)) return null;
            return {type: "join", room, createRoom: createRoom === true, name};
        }
        case "leave": {
            return {type: "leave"};
        }
        case "offer":
        case "answer": {
            if(!isText(to, 1, 64) || !isText(sdp, 1, 50000)) return null;
            return {type, to, sdp};
        }
        case "candidate": {
            if(!isText(to, 1, 64) || !isText(candidate, 1, 2000)) return null;
            return {type: "candidate", to, candidate};
        }
        default:
            return null;
    }
}