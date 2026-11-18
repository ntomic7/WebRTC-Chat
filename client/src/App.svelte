<script lang="ts">
  import { onMount } from "svelte";
  import {session, connect, disconnect, tryJoinCall} from "./lib/session.svelte";
  import {getRoomFromUrl} from "./lib/room";
  import ControlButtons from "./lib/components/ControlButtons.svelte";
  import VideoComponent from "./lib/components/VideoComponent.svelte";


  let joinCallModal = $state<HTMLDialogElement>();

  async function join(){
    if(await tryJoinCall()) joinCallModal?.close();
  }

  // ON START CALL
  onMount(() => {
    session.roomName = getRoomFromUrl(window.location.search);
    if (session.roomName) joinCallModal?.showModal();

    connect();
    return () => {disconnect();};
  });
</script>

<main>
  <div class="app">
    <header class="topbar">
      <h1>WebRTC chat</h1>
      <ControlButtons onJoinClick={() => joinCallModal?.showModal()} />
    </header>

    <p class="banner">{session.status}</p>
    {#if session.notice}
      <p class="banner notice">{session.notice}</p>
    {/if}

    <VideoComponent />

    <dialog bind:this={joinCallModal}>
      <h2>Enter room ID</h2>
      <input bind:value={session.roomName} placeholder="Room name" />
      <input bind:value={session.username} placeholder="Enter name" />
      <button onclick={join} disabled={!session.serverUp}>Join call</button>
      <button onclick={() => joinCallModal?.close()}>Cancel</button>
    </dialog>
  </div>
</main>
