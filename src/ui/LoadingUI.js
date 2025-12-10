export class LoadingUI {
  constructor() {
    this.overlay = document.getElementById("loading-overlay");
    this.progressBarFill = document.getElementById("progress-bar-fill");
    this.startButton = document.getElementById("start-button");
    this.onStartCallback = null;

    if (this.startButton) {
      this.startButton.addEventListener("click", () => {
        this.handleStart();
      });
    }
  }

  onStart(callback) {
    this.onStartCallback = callback;
  }

  handleStart() {
    console.log("Starting 3D world...");
    if (this.overlay) this.overlay.style.opacity = "0";
    setTimeout(() => {
      if (this.overlay) this.overlay.style.display = "none";
      if (this.onStartCallback) this.onStartCallback();
    }, 500);
  }

  showStartButton() {
    if (this.progressBarFill) this.progressBarFill.style.width = "100%";
    setTimeout(() => {
      if (this.startButton) {
        this.startButton.style.display = "block";
        this.startButton.style.opacity = "1";
      }
    }, 500);
  }

  updateProgress(progress) {
    if (this.progressBarFill) {
      this.progressBarFill.style.width = `${progress * 100}%`;
    }
  }
}
