<script lang="ts">
import {session, startCall, leaveCall} from "../session.svelte";
import{media, toggleMic, toggleCam} from "../streams.svelte";
import {copyRoomLink} from "../room";

type Props = {
    onJoinClick: () => void;
}
let {onJoinClick}: Props = $props();
</script>

<div class="controls">
    {#if session.joined}
        <span class="room">Room: {session.currentRoom}</span>
        <button onclick={copyRoomLink}>Copy invite link</button>
        <button onclick={toggleMic}>{media.micOn ? "Mute" : "Unmute"}</button>
        <button onclick={toggleCam}>{media.camOn ? "Camera off" : "Camera on"}</button>
        <button onclick={leaveCall}>Leave call</button>
    {:else}
        <input bind:value={session.username} placeholder="Enter name" />
        <button onclick={startCall} disabled={!session.connectedToServer}>Start new call</button>
        <button onclick={onJoinClick} disabled={!session.connectedToServer}>Join call</button>
    {/if}
</div>