<script setup lang="ts">
const boardWidth = ref(15);
const boardHeight = ref(15);
const numBombs = ref(15);
const maxBombs = computed(() => Math.floor(boardWidth.value * boardHeight.value * 0.35));

const { connectionType, gameId, connecting, connectFromSetup } = useRouteGameConnection();
const { gameError } = useGameError();

const onConnect = async (): Promise<void> => {
  await connectFromSetup({
    rows: boardHeight.value,
    cols: boardWidth.value,
    numBombs: numBombs.value
  });
};
</script>

<template>
  <h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-slate-800">Minesweeper 💣</h1>
  <p v-if="gameError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
    {{ gameError }}
  </p>
  <div class="space-y-4">
    <div class="flex flex-col space-y-2">
      <label class="inline-flex items-center">
        <input type="radio" v-model="connectionType" value="create" class="h-4 w-4 text-blue-600" />
        <span class="ml-2">Create Game</span>
      </label>
      <label class="inline-flex items-center">
        <input type="radio" v-model="connectionType" value="join" class="h-4 w-4 text-blue-600" />
        <span class="ml-2">Join Game</span>
      </label>
    </div>

    <div v-if="connectionType === 'create'" class="space-x-8 flex justify-between">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Size</label>
        <div class="flex items-center space-x-2">
          <input v-model.number="boardWidth" type="number" min="5" max="30"
            class="w-16 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center" />
          <span class="text-gray-500">×</span>
          <input v-model.number="boardHeight" type="number" min="5" max="30"
            class="w-16 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Bombs</label>
        <input v-model.number="numBombs" type="number" :min="1" :max="maxBombs"
          class="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
      </div>
    </div>

    <input v-if="connectionType === 'join'" v-model="gameId" placeholder="Enter Game ID" @keyup.enter="onConnect"
      class="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />

    <button @click="onConnect" :disabled="connecting"
      class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
      {{ connecting ? "Connecting..." : connectionType === "create" ? "Create Game" : "Join Game" }}
    </button>
  </div>
</template>
