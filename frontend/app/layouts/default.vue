<template>
    <div
        class="h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f8fafc_0%,#e2e8f0_45%,#cbd5e1_100%)] p-4">
        <div
            class="mx-auto flex h-full max-w-[1500px] flex-col rounded-2xl border border-slate-300/80 bg-white/95 p-4 shadow-2xl">
            <h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-slate-800">Minesweeper 💣</h1>
            <slot />
        </div>
    </div>
</template>