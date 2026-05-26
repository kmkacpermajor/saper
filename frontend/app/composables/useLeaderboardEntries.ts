import { BoardSize, Difficulty } from "@saper/contracts";

type LeaderboardApiEntry = {
  id: number;
  rank: number;
  levelCode: string;
  playerNames: string[];
  timeMs: number;
  completedAt: string;
};

type LeaderboardEntryViewModel = LeaderboardApiEntry & {
  formattedTime: string;
  formattedDate: string;
};

const boardSizeCodeMap: Record<BoardSize, string | null> = {
  [BoardSize.SMALL]: "S",
  [BoardSize.MEDIUM]: "M",
  [BoardSize.BIG]: "B",
  [BoardSize.HUGE]: "H",
  [BoardSize.CUSTOM]: null
};

const difficultyCodeMap: Record<Difficulty, string | null> = {
  [Difficulty.EASY]: "E",
  [Difficulty.INTERMEDIATE]: "I",
  [Difficulty.HARD]: "H",
  [Difficulty.EXPERT]: "X",
  [Difficulty.CUSTOM]: null
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export const resolveLevelCode = (boardSize: BoardSize, difficulty: Difficulty): string | null => {
  const boardSizeCode = boardSizeCodeMap[boardSize];
  const difficultyCode = difficultyCodeMap[difficulty];

  if (!boardSizeCode || !difficultyCode) {
    return null;
  }

  return `${boardSizeCode}${difficultyCode}`;
};

export const useLeaderboardEntries = () => {
  const runtimeConfig = useRuntimeConfig();
  const { boardSize, difficulty } = useGameSetupState();
  const entries = ref<LeaderboardEntryViewModel[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const levelCode = computed(() => resolveLevelCode(boardSize.value, difficulty.value));

  const loadEntries = async (): Promise<void> => {
    if (!levelCode.value) {
      entries.value = [];
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const leaderboardUrl = String(runtimeConfig.public.leaderboardUrl ?? "");
      const response = await $fetch<{ entries: LeaderboardApiEntry[] }>(
        `${leaderboardUrl}/leaderboard`,
        {
          query: {
            level: levelCode.value,
            limit: 10
          }
        }
      );

      entries.value = response.entries.map((entry) => ({
        ...entry,
        formattedTime: formatTime(entry.timeMs),
        formattedDate: formatDate(entry.completedAt)
      }));
    } catch {
      error.value = "Could not load leaderboard.";
      entries.value = [];
    } finally {
      loading.value = false;
    }
  };

  watch(levelCode, () => {
    void loadEntries();
  }, { immediate: true });

  return {
    entries,
    loading,
    error,
    levelCode
  };
};