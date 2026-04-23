type LeaderboardApiEntry = {
  id: number;
  playerNames: Array<string>;
  timeMs: number;
};

type LeaderboardEntryViewModel = LeaderboardApiEntry & {
  formattedTime: string;
};

const formatTime = (timeMs: number): string => {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const milliseconds = timeMs % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(3, "0")}`;
};

export const useLeaderboardEntries = () => {
  const entries = ref<LeaderboardEntryViewModel[]>([]);

  const mockedApiEntries: LeaderboardApiEntry[] = [
    { id: 1, playerNames: ["Alice"], timeMs: 120123 },
    { id: 2, playerNames: ["Bob", "Charlie"], timeMs: 1234125 }
  ];

  entries.value = mockedApiEntries.map(entry => ({
    ...entry,
    formattedTime: formatTime(entry.timeMs)
  }));

  return {
    entries
  };
};