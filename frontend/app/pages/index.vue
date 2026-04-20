<script setup lang="ts">

const { gameError } = useGameError();

</script>

<template>
    <section class="mx-auto w-full max-w-xl">
        <p v-if="gameError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {{ gameError }}
        </p>

        <GameSetupForm />
    </section>
</template>
