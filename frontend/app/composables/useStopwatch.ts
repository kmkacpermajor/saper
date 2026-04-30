import { ref, onUnmounted } from 'vue';

export const useStopwatch = () => {
  const timerElement = ref<HTMLElement | null>(null);
  let animationFrameId: number | null = null;
  let isRunning = false; 

  const stop = () => {
    isRunning = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const start = (startOffsetMs: number = 0) => {
    stop();
    isRunning = true;
    const startTime = Date.now() - startOffsetMs;

    const tick = () => {
      if (!isRunning) return; 
      if (timerElement.value) {
        const currentMs = Date.now() - startTime;
        timerElement.value.textContent = `${formatTime(currentMs)}`;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
  };

  const freezeAt = (exactTimeMs: number) => {
    stop();
    if (timerElement.value) {
      timerElement.value.textContent = `${formatTime(exactTimeMs)}`;
    }
  };

  onUnmounted(() => {
    stop();
    timerElement.value = null;
  });

  return { timerElement, start, stop, freezeAt };
};