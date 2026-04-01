import { TileType, type TileCoordinates } from "@saper/contracts";
import log from "@/services/logger";
import type GameController from "../gameController";

const LEFT_MOUSE_BUTTON = 0;
const RIGHT_MOUSE_BUTTON = 2;

const isSameTile = (a: TileCoordinates | null, b: TileCoordinates): boolean =>
  a !== null && a.y === b.y && a.x === b.x;

export default class MouseInputHandler {
  private mouseButtonsMask = 0;
  private gestureTile: TileCoordinates | null = null;
  private chordArmedForGesture = false;
  private chordTriggeredForGesture = false;

  constructor(private readonly controller: GameController) {}

  handleCanvasMouseDown = (event: MouseEvent): void => {
    if (!this.controller.isGameInProgress()) {
      return;
    }

    const pointerTile = this.controller.resolveTileFromClientPosition(
      event.clientX,
      event.clientY
    );
    if (!pointerTile) {
      return;
    }

    const previousMask = this.mouseButtonsMask;
    const currentMask = event.buttons & 0b11;
    this.mouseButtonsMask = currentMask;

    if (previousMask === 0 || this.gestureTile === null || !isSameTile(this.gestureTile, pointerTile)) {
      this.gestureTile = pointerTile;
      this.chordTriggeredForGesture = false;
    }

    const bothPressedNow = currentMask === 0b11;
    const bothPressedBefore = previousMask === 0b11;
    if (!bothPressedBefore && bothPressedNow && this.gestureTile && !this.chordArmedForGesture) {
      this.controller.applyChordPreview(this.gestureTile);
      this.chordArmedForGesture = true;
      log.debug("[client] Combo armed on buttons transition", {
        tile: this.gestureTile,
        previousMask,
        currentMask
      });
    }

    log.debug("[client] Canvas mousedown", {
      tile: pointerTile,
      button: event.button,
      previousMask,
      currentMask,
      gestureTile: this.gestureTile,
      chordTriggeredForGesture: this.chordTriggeredForGesture
    });
  };

  handleWindowMouseUp = (event: MouseEvent): void => {
    const previousMask = this.mouseButtonsMask;
    const currentMask = event.buttons & 0b11;
    this.mouseButtonsMask = currentMask;

    if (previousMask === 0b11 && currentMask !== 0b11) {
      this.controller.clearChordPreview();

      if (this.chordArmedForGesture && this.gestureTile && !this.chordTriggeredForGesture) {
        log.debug("[client] Combo reveal triggered on release", {
          tile: this.gestureTile,
          previousMask,
          currentMask
        });
        this.controller.tryChordReveal(this.gestureTile);
        this.chordTriggeredForGesture = true;
      }

      this.chordArmedForGesture = false;
    }

    if (previousMask === 0) {
      return;
    }

    const isLeftRelease = event.button === LEFT_MOUSE_BUTTON;
    const isRightRelease = event.button === RIGHT_MOUSE_BUTTON;
    if (!isLeftRelease && !isRightRelease) {
      if (this.mouseButtonsMask === 0) {
        this.reset();
      }
      return;
    }

    const pointerTile = this.controller.resolveTileFromClientPosition(
      event.clientX,
      event.clientY
    );
    const shouldSkipSingleAction =
      previousMask === 0b11 || this.chordArmedForGesture || this.chordTriggeredForGesture;

    if (
      !shouldSkipSingleAction &&
      this.controller.isGameInProgress() &&
      this.gestureTile !== null &&
      pointerTile !== null &&
      isSameTile(this.gestureTile, pointerTile)
    ) {
      const tileType = this.controller.getTileType(pointerTile);
      if (isLeftRelease && tileType === TileType.HIDDEN) {
        log.debug("[client] Single reveal triggered", { tile: pointerTile });
        this.controller.revealTile(pointerTile);
      }

      if (isRightRelease && (tileType === TileType.HIDDEN || tileType === TileType.FLAGGED)) {
        log.debug("[client] Flag toggle triggered", {
          tile: pointerTile,
          unflag: tileType === TileType.FLAGGED
        });
        this.controller.toggleFlag(pointerTile);
      }
    }

    log.debug("[client] Window mouseup", {
      tile: pointerTile,
      button: event.button,
      previousMask,
      currentMask,
      shouldSkipSingleAction,
      gestureTile: this.gestureTile,
      chordTriggeredForGesture: this.chordTriggeredForGesture
    });

    if (this.mouseButtonsMask === 0) {
      this.reset();
    }
  };

  reset(): void {
    this.controller.clearChordPreview();
    log.debug("[client] Resetting gesture state", {
      mouseButtonsMask: this.mouseButtonsMask,
      gestureTile: this.gestureTile
    });

    this.gestureTile = null;
    this.mouseButtonsMask = 0;
    this.chordArmedForGesture = false;
    this.chordTriggeredForGesture = false;
  }
}
