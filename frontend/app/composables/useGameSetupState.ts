import { BoardSize, Difficulty } from "@saper/contracts";

export const useGameSetupState = () => {
    const boardSize = useState("gameSetup:board-size", () => BoardSize.MEDIUM);
    const difficulty = useState("gameSetup:difficulty", () => Difficulty.INTERMEDIATE);
    const customBoardWidth = useState("gameSetup:custom-board-width", () => 15);
    const customBoardHeight = useState("gameSetup:custom-board-height", () => 15);
    const customNumBombs = useState("gameSetup:custom-num-bombs", () => 15);
    
    return {
        boardSize,
        difficulty,
        customBoardWidth,
        customBoardHeight,
        customNumBombs
    };
}