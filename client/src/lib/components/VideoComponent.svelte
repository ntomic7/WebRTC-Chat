<script lang="ts">
    import {session} from "../session.svelte";
    import ChatComponent from "./ChatComponent.svelte";
    import {media, setSrcObject} from "../streams.svelte";

    let localVideo = $state<HTMLVideoElement>();
    $effect(() => {
        if (localVideo) localVideo.srcObject = media.stream ?? null;
    });
</script>

<div class="content">
    {#if session.joined}
        <section class="videos">
            <div class="tile local">
                <video bind:this={localVideo} autoplay muted playsinline></video>
                <p class="name">{session.usernames[session.myId] ?? ""} (you)</p>
            </div>
            {#each session.remoteStreams as remote (remote.id)}
                <div class="tile">
                    <video use:setSrcObject={remote.stream} autoplay playsinline></video>
                    <p class="name">{session.usernames[remote.id] ?? "Guest"}</p>
                </div>
            {/each}
        </section>

        <ChatComponent />
    {:else}
        <div class="empty-state">
            <p>Start a new call, or join one with a room id.</p>
        </div>
    {/if}
</div>