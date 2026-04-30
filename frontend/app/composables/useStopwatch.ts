import { ref, onUnmounted } from 'vue';
// import { formatTime } from '@/utils/formatTime';

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

  // NOWA FUNKCJA: Zatrzymuje timer i ustawia sztywną wartość
  const freezeAt = (exactTimeMs: number) => {
    stop(); // Ubijamy pętlę
    if (timerElement.value) {
      // Wpisujemy na sztywno czas z serwera
      timerElement.value.textContent = `${formatTime(exactTimeMs)}`;
    }
  };

  onUnmounted(() => {
    stop();
    timerElement.value = null;
  });

  return { timerElement, start, stop, freezeAt }; // Eksportujemy freezeAt
};