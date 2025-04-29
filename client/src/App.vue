<template>
  <div class="game-container">
    <!-- Connection Form -->
    <div class="game-controls" v-if="!gameRunning">
      <div class="connection-options">
        <label>
          <input type="radio" v-model="connectionType" value="create"> Create New Game
        </label>
        <label>
          <input type="radio" v-model="connectionType" value="join"> Join Existing Game
        </label>
      </div>

      <input 
        v-if="connectionType === 'join'"
        v-model="gameId" 
        placeholder="Enter Game ID"
        @keyup.enter="handleConnect"
      >

      <button @click="handleConnect" :disabled="connecting">
        {{ connecting ? 'Connecting...' : connectionType === 'create' ? 'Create Game' : 'Connect' }}
      </button>
      
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>

    <!-- Canvas Container -->
    <div ref="gameCanvasContainer" v-show="gameRunning"></div>

    <!-- Game UI -->
    <div v-if="gameRunning" class="game-ui">
      <button @click="handleDisconnect" class="disconnect-btn">
        Disconnect
      </button>
      <p class="game-status">Connected to: {{ currentGameId }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, watch } from 'vue'
import Minesweeper from '@/game/minesweeper'

const gameCanvasContainer = ref(null);
const gameRunning = ref(false);
const connecting = ref(false);
const error = ref(null);
const connectionType = ref('create');
const gameId = ref('');

const currentGameId = ref('');

let gameInstance = null;

const handleConnect = async () => {
  if (connecting.value) return;
  
  error.value = null;
  connecting.value = true;

  try {
    // Validate input if joining
    if (connectionType.value === 'join' && !gameId.value) {
      throw new Error('Please enter a Game ID');
    }

    gameInstance = new Minesweeper(connectionType.value === 'join' ? gameId.value : 0xFF, handleGameEvent);
    await gameInstance.init();

    gameCanvasContainer.value.appendChild(gameInstance.app.canvas);

    gameRunning.value = true;
  } catch (err) {
    error.value = `Connection failed: ${err.message}`;
    console.error('Game connection error:', err);
  } finally {
    connecting.value = false;
  }
}

const handleGameEvent = (event) => {
  switch (event.type) {
    case 'GAME_ID_UPDATE':
      currentGameId.value = event.payload
      break
  }
}

const handleDisconnect = () => {
  if (gameInstance) {
    gameInstance.app.stop();
    gameInstance.cleanup();
    if (gameCanvasContainer.value.contains(gameInstance.app.canvas)) {
      gameCanvasContainer.value.removeChild(gameInstance.app.canvas);
    }
    gameInstance.app.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true
    });
    gameInstance = null;

  }
  
  gameRunning.value = false
  resetGameState()
}

function resetGameState() {
  currentGameId.value = ''
}

onBeforeUnmount(() => {
  handleDisconnect();
});
</script>

<style scoped>
/* Add your styles here */
</style>