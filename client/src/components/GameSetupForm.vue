<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  boardHeight: number;
  boardWidth: number;
  connecting: boolean;
  connectionType: "create" | "join";
  error: string | null;
  gameId: string;
  maxBombs: number;
  numBombs: number;
}>();

const emit = defineEmits<{
  (e: "connect"): void;
  (e: "update:boardHeight", value: number): void;
  (e: "update:boardWidth", value: number): void;
  (e: "update:connectionType", value: "create" | "join"): void;
  (e: "update:gameId", value: string): void;
  (e: "update:numBombs", value: number): void;
}>();

const connectionTypeModel = computed({
  get: () => props.connectionType,
  set: (value: "create" | "join") => emit("update:connectionType", value)
});

const gameIdModel = computed({
  get: () => props.gameId,
  set: (value: string) => emit("update:gameId", value)
});

const boardWidthModel = computed({
  get: () => props.boardWidth,
  set: (value: number) => emit("update:boardWidth", value)
});

const boardHeightModel = computed({
  get: () => props.boardHeight,
  set: (value: number) => emit("update:boardHeight", value)
});

const numBombsModel = computed({
  get: () => props.numBombs,
  set: (value: number) => emit("update:numBombs", value)
});

const onConnect = (): void => {
  emit("connect");
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col space-y-2">
      <label class="inline-flex items-center">
        <input type="radio" v-model="connectionTypeModel" value="create" class="h-4 w-4 text-blue-600" />
        <span class="ml-2">Create New Game</span>
      </label>
      <label class="inline-flex items-center">
        <input type="radio" v-model="connectionTypeModel" value="join" class="h-4 w-4 text-blue-600" />
        <span class="ml-2">Join Existing Game</span>
      </label>
    </div>

    <div v-if="connectionTypeModel === 'create'" class="space-x-8 flex justify-between">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Size</label>
        <div class="flex items-center space-x-2">
          <input
            v-model.number="boardWidthModel"
            type="number"
            min="5"
            max="30"
            class="w-16 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center"
          />
          <span class="text-gray-500">×</span>
          <input
            v-model.number="boardHeightModel"
            type="number"
            min="5"
            max="30"
            class="w-16 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Bombs</label>
        <input
          v-model.number="numBombsModel"
          type="number"
          :min="1"
          :max="maxBombs"
          class="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>

    <input
      v-if="connectionTypeModel === 'join'"
      v-model="gameIdModel"
      placeholder="Enter Game ID"
      @keyup.enter="onConnect"
      class="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
    />

    <button
      @click="onConnect"
      :disabled="connecting"
      class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ connecting ? "Connecting..." : connectionTypeModel === "create" ? "Create Game" : "Connect" }}
    </button>

    <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
  </div>
</template>
