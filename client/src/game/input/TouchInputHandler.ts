import { TileType, type TileCoordinates } from "@saper/contracts";
import log from "@/services/logger";
import type GameController from "../gameController";

const LONG_PRESS_DURATION_MS = 450;
const TOUCH_MOVE_TOLERANCE_PX = 18;

const isSameTile = (a: TileCoordinates | null, b: TileCoordinates): boolean =>
  a !== null && a.y === b.y && a.x === b.x;

export default class TouchInputHandler {
  private touchGestureTile: TileCoordinates | null = null;
  private touchStartClientPoint: { x: number; y: number } | null = null;
  private touchLongPressTimer: ReturnType<typeof setTimeout> | null = null;
  private touchLongPressTriggered = false;
  private touchGestureCanceled = false;
  private touchChordArmedForGesture = false;

  constructor(private readonly controller: GameController) {}

  handleCanvasTouchStart = (event: TouchEvent): void => {
    if (!this.controller.isGameInProgress()) {
      return;
    }

    if (event.touches.length !== 1) {
      this.cancelTouchGesture(true);
      return;
    }

    const touch = event.touches[0];
    const pointerTile = this.controller.resolveTileFromClientPosition(
      touch.clientX,
      touch.clientY
    );
    if (!pointerTile) {
      this.cancelTouchGesture(true);
      return;
    }

    event.preventDefault();
    this.cancelTouchGesture(false);

    this.touchGestureTile = pointerTile;
    this.touchStartClientPoint = { x: touch.clientX, y: touch.clientY };
    this.touchLongPressTriggered = false;
    this.touchGestureCanceled = false;

    this.touchLongPressTimer = setTimeout(() => {
      if (
        !this.controller.isGameInProgress() ||
        this.touchGestureCanceled ||
        this.touchGestureTile === null
      ) {
        return;
      }

      const tile = this.touchGestureTile;
      const tileType = this.controller.getTileType(tile);
      if (tileType === undefined) {
        return;
      }

      if (tileType === TileType.HIDDEN) {
        log.debug("[client] Long touch reveal triggered", { tile });
        this.controller.revealTile(tile);
      } else if (tileType !== TileType.FLAGGED) {
        this.controller.applyChordPreview(tile);
        this.touchChordArmedForGesture = true;
        log.debug("[client] Long touch chord armed", { tile });
      }

      this.touchLongPressTriggered = true;
    }, LONG_PRESS_DURATION_MS);
  };

  handleCanvasTouchMove = (event: TouchEvent): void => {
    if (this.touchGestureTile === null || this.touchGestureCanceled) {
      return;
    }

    if (event.touches.length !== 1) {
      this.cancelTouchGesture(true);
      return;
    }

    const touch = event.touches[0];
    const startPoint = this.touchStartClientPoint;
    if (!startPoint) {
      this.cancelTouchGesture(true);
      return;
    }

    const movedDistance = Math.hypot(touch.clientX - startPoint.x, touch.clientY - startPoint.y);
    if (movedDistance > TOUCH_MOVE_TOLERANCE_PX) {
      this.cancelTouchGesture(true);
      return;
    }

    event.preventDefault();
  };

  handleCanvasTouchEnd = (event: TouchEvent): void => {
    if (this.touchGestureTile === null) {
      return;
    }

    event.preventDefault();

    const tile = this.touchGestureTile;
    const longPressTriggered = this.touchLongPressTriggered;
    const wasCanceled = this.touchGestureCanceled;
    const touch = event.changedTouches[0];

    this.clearTouchLongPressTimer();

    if (longPressTriggered && this.touchChordArmedForGesture && this.controller.isGameInProgress()) {
      this.controller.clearChordPreview();
      log.debug("[client] Long touch chord reveal triggered on release", { tile });
      this.controller.tryChordReveal(tile);
    }

    if (!longPressTriggered && !wasCanceled && touch && this.controller.isGameInProgress()) {
      const pointerTile = this.controller.resolveTileFromClientPosition(
        touch.clientX,
        touch.clientY
      );
      if (pointerTile && isSameTile(tile, pointerTile)) {
        const tileType = this.controller.getTileType(tile);
        if (tileType === TileType.HIDDEN || tileType === TileType.FLAGGED) {
          log.debug("[client] Single tap flag toggle triggered", {
            tile,
            unflag: tileType === TileType.FLAGGED
          });
          this.controller.toggleFlag(tile);
        }
      }
    }

    this.reset();
  };

  handleCanvasTouchCancel = (): void => {
    this.cancelTouchGesture(true);
    this.reset();
  };

  reset(): void {
    this.clearTouchLongPressTimer();
    this.touchGestureTile = null;
    this.touchStartClientPoint = null;
    this.touchLongPressTriggered = false;
    this.touchGestureCanceled = false;
    if (this.touchChordArmedForGesture) {
      this.controller.clearChordPreview();
    }
    this.touchChordArmedForGesture = false;
  }

  private clearTouchLongPressTimer(): void {
    if (this.touchLongPressTimer === null) {
      return;
    }

    clearTimeout(this.touchLongPressTimer);
    this.touchLongPressTimer = null;
  }

  private cancelTouchGesture(markCanceled: boolean): void {
    this.clearTouchLongPressTimer();
    if (markCanceled) {
      this.touchGestureCanceled = true;
      if (this.touchChordArmedForGesture) {
        this.controller.clearChordPreview();
        this.touchChordArmedForGesture = false;
      }
    }
  }
}
