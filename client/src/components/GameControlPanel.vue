<script setup lang="ts">
const props = defineProps<{
  gameId: string;
  gameRunning: boolean;
  statusText: string;
}>();

const emit = defineEmits<{
  (e: "disconnect"): void;
  (e: "reset"): void;
}>();

const onDisconnect = (): void => {
  emit("disconnect");
};

const onReset = (): void => {
  emit("reset");
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="text-sm text-gray-600">Game ID:</p>
      <code class="block bg-gray-100 px-3 py-2 rounded font-mono text-sm">{{ props.gameId }}</code>
    </div>

    <p class="text-sm" :class="props.gameRunning ? 'text-green-600' : 'text-red-600'">
      {{ props.statusText }}
    </p>

    <button
      v-if="props.gameRunning"
      @click="onReset"
      class="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md"
    >
      Reset Game
    </button>

    <button
      @click="onDisconnect"
      class="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md"
    >
      Disconnect
    </button>
  </div>
</template>
