export const useGameError = () => {
  const gameError = useState<string | null>("game-error", () => null);

  const setGameError = (message: string): void => {
    gameError.value = message;
  };

  const clearGameError = (): void => {
    gameError.value = null;
  };

  return {
    gameError,
    setGameError,
    clearGameError
  };
};