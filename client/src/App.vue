<script setup>
import { ref, onBeforeUnmount, watch, computed } from 'vue'
import Minesweeper from '@/game/minesweeper'

const gameCanvasContainer = ref(null);
const gameRunning = ref(false);
const connecting = ref(false);
const error = ref(null);
const connectionType = ref('create');
const gameId = ref('');

const currentGameId = ref('');
const currentGameState = ref(0);
const currentNumBombs = ref(0);
const boardWidth = ref(15);
const boardHeight = ref(15);
const numBombs = ref(15);
const maxBombs = computed(() => Math.floor(boardWidth.value * boardHeight.value * 0.35));

const gameStatusMessage = computed(() => {
  if (currentGameState.value === 0) return "In progress";
  if (currentGameState.value === 1) return "You won! 🎉";
  return 'Game over 💥';
});

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

    if (numBombs > maxBombs) {
      throw new Error('Too much');
    }

    gameInstance = new Minesweeper(connectionType.value === 'join' ? gameId.value : 0xFF, handleGameEvent);
    await gameInstance.init(boardHeight.value, boardWidth.value, numBombs.value);

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
      currentGameId.value = event.payload;
      break;
    case 'GAME_STATE_UPDATE':
      currentGameState.value = event.payload;
      break;
    case 'NUM_BOMBS_UPDATE':
      currentNumBombs.value = event.payload;
      break;
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

const handleReset = () => {
  if (gameInstance) {
    gameInstance.sendReset();
  }
}

function resetGameState() {
  currentGameId.value = ''
  currentGameState.value = 0
  currentNumBombs.value = 0
}

onBeforeUnmount(() => {
  handleDisconnect();
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-md p-6 w-auto flex flex-col items-center">
      <!-- Game Title -->
      <h1 class="text-3xl font-bold text-gray-800">Minesweeper 💣</h1>

      <!-- Connection Form -->
      <div v-if="!gameRunning" class="space-y-4">
        <div class="flex flex-col space-y-2">
          <label class="inline-flex items-center">
            <input type="radio" v-model="connectionType" value="create" class="h-4 w-4 text-blue-600" />
            <span class="ml-2">Create New Game</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" v-model="connectionType" value="join" class="h-4 w-4 text-blue-600" />
            <span class="ml-2">Join Existing Game</span>
          </label>
        </div>

        <!-- Game Configuration (shown only when creating new game) -->
        <div v-if="connectionType === 'create'" class="space-x-8 flex justify-between">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <div class="flex items-center space-x-2">
              <input v-model="boardWidth" type="number" min="5" max="30"
                class="w-16 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center" />
              <span class="text-gray-500">×</span>
              <input v-model="boardHeight" type="number" min="5" max="30"
                class="w-16 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center" />
            </div>
          </div>


          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Bombs</label>
            <input v-model="numBombs" type="number" :min="1" :max="maxBombs"
              class="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <input v-if="connectionType === 'join'" v-model="gameId" placeholder="Enter Game ID"
          @keyup.enter="handleConnect"
          class="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />

        <button @click="handleConnect" :disabled="connecting"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
          {{ connecting ? 'Connecting...' : connectionType === 'create' ? 'Create Game' : 'Connect' }}
        </button>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
      </div>

      <!-- Game Status -->
      <div class="mt-4 text-center" v-show="gameRunning">
        <p class="text-lg font-semibold min-h-6" :class="{
          'text-green-600': currentGameState === 1,
          'text-red-600': currentGameState === -1
        }">
          {{ currentGameState !== 0 ? gameStatusMessage : `Mine count: ${currentNumBombs}` }}
        </p>
        <p class="text-sm text-gray-600">Connected to: {{ currentGameId }}</p>
      </div>

      <!-- Canvas Container -->
      <div v-show="gameRunning"
        class="my-4 w-min justify-center border border-gray-400 bg-gray-100 rounded-lg shadow-md p-4">
        <div ref="gameCanvasContainer" id="gameCanvasContainer" class="border-1 border-gray-400">
        </div>
      </div>


      <!-- Game UI -->
      <div v-if="gameRunning" class="w-full">
        <div class="flex space-x-2">
          <button @click="handleDisconnect"
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md">
            Disconnect
          </button>
          <button @click="handleReset" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>