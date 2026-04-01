type Point = { x: number; y: number };

type ViewportState = {
  cameraX: number;
  cameraY: number;
  zoom: number;
};

export default class ViewportController {
  private viewportWidth = 1;
  private viewportHeight = 1;
  private worldWidth = 1;
  private worldHeight = 1;

  private cameraX = 0;
  private cameraY = 0;
  private zoom = 1;

  private readonly minZoom = 0.12;
  private readonly maxZoom = 4;

  setViewportSize(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.clampCamera();
  }

  setWorldSize(width: number, height: number): void {
    this.worldWidth = Math.max(1, width);
    this.worldHeight = Math.max(1, height);
    this.clampCamera();
  }

  fitToViewport(paddingRatio = 0.92, minZoomFloor = 0): void {
    const fitZoom = Math.min(
      this.viewportWidth / this.worldWidth,
      this.viewportHeight / this.worldHeight
    );

    this.zoom = this.clampZoom(Math.max(fitZoom * paddingRatio, minZoomFloor));
    const visibleWorldWidth = this.viewportWidth / this.zoom;
    const visibleWorldHeight = this.viewportHeight / this.zoom;

    this.cameraX = (this.worldWidth - visibleWorldWidth) / 2;
    this.cameraY = (this.worldHeight - visibleWorldHeight) / 2;
    this.clampCamera();
  }

  centerAtCurrentZoom(): void {
    const visibleWorldWidth = this.viewportWidth / this.zoom;
    const visibleWorldHeight = this.viewportHeight / this.zoom;

    this.cameraX = (this.worldWidth - visibleWorldWidth) / 2;
    this.cameraY = (this.worldHeight - visibleWorldHeight) / 2;
    this.clampCamera();
  }

  panByWorldDelta(dx: number, dy: number): void {
    this.cameraX += dx;
    this.cameraY += dy;
    this.clampCamera();
  }

  zoomAtScreenPoint(scaleFactor: number, screenX: number, screenY: number): void {
    const targetZoom = this.clampZoom(this.zoom * scaleFactor);
    if (targetZoom === this.zoom) {
      return;
    }

    const worldBefore = this.screenToWorld(screenX, screenY);
    this.zoom = targetZoom;

    // Keep the world point under the cursor stable while zooming.
    this.cameraX = worldBefore.x - screenX / this.zoom;
    this.cameraY = worldBefore.y - screenY / this.zoom;
    this.clampCamera();
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: this.cameraX + screenX / this.zoom,
      y: this.cameraY + screenY / this.zoom
    };
  }

  getState(): ViewportState {
    return {
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      zoom: this.zoom
    };
  }

  private clampZoom(value: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, value));
  }

  private clampCamera(): void {
    const visibleWorldWidth = this.viewportWidth / this.zoom;
    const visibleWorldHeight = this.viewportHeight / this.zoom;

    const maxCameraX = Math.max(0, this.worldWidth - visibleWorldWidth);
    const maxCameraY = Math.max(0, this.worldHeight - visibleWorldHeight);

    this.cameraX = Math.min(maxCameraX, Math.max(0, this.cameraX));
    this.cameraY = Math.min(maxCameraY, Math.max(0, this.cameraY));
  }
}
