export function setSrcObject(node: HTMLVideoElement, stream: MediaStream) {
    node.srcObject = stream;
    return{
        update(newStream: MediaStream) {
            node.srcObject = newStream;
        },
    };
}

export const media = $state({
    micOn: true,
    camOn: true,
    stream: undefined as MediaStream | undefined,
});

export function setStream(stream: MediaStream) {
    media.stream = stream;
}

export function toggleMic(){
    if(!media.stream) return;
    media.micOn = !media.micOn;
    for(const track of media.stream.getAudioTracks())
        track.enabled = media.micOn;
}
export function toggleCam(){
    if(!media.stream) return;
    media.camOn = !media.camOn;
    for(const track of media.stream.getVideoTracks())
        track.enabled = media.camOn;
}
export function stopStream(){
    for(const track of media.stream?.getTracks() ??  [])
        track.stop();
    media.stream = undefined;
    media.micOn = true;
    media.camOn = true;
}