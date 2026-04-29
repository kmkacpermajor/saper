<script setup lang="ts">
    import VueQr from 'vue-qr'

    const currentUrl = ref('')

    onMounted(() => {
        currentUrl.value = window.location.href
    })
</script>

<template>
    <div class="flex flex-col items-center gap-4">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Scan QR Code to Join Game</h2>
        <ClientOnly>
            <vue-qr :text="currentUrl" :size="200" :colorDark="'#000000'" :colorLight="'#ffffff'"/>

            <template #fallback>
                <div class="loading-placeholder">
                Generating QR Code...
                </div>
            </template>
        </ClientOnly>
    </div>
</template>

<style scoped>
.loading-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border-radius: 8px;
}
</style>