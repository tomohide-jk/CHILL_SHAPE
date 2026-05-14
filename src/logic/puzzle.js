/**
 * REBOOT_GATE — Puzzle Logic
 * 4-stage DJ console puzzle system
 *
 * Stage 1: POWER ON — Find and press the power button
 * Stage 2: FREQUENCY MATCH — Slide 4 faders to correct positions
 * Stage 3: BEAT SYNC — Click turntables in rhythm
 * Stage 4: DROP TRIGGER — Press the DROP button with all systems online
 */

export class PuzzleManager {
  constructor() {
    this.currentStage = 0; // 0 = not started, 1-4 = stages
    this.maxStages = 4;
    this.stageCompleted = [false, false, false, false];
    this.isComplete = false;

    // Stage 3: Beat sync state
    this.beatSyncClicks = [];
    this.targetBPM = 150;
    this.beatSyncTolerance = 30; // ms tolerance
    this.beatSyncRequired = 6; // clicks needed
    this.beatSyncCorrectCount = 0;

    // Hint system
    this.hintTimer = 0;
    this.hintDelay = 12; // seconds before showing hint
    this.lastInteractionTime = 0;

    // Callbacks
    this.onStageChange = null;
    this.onHint = null;
    this.onComplete = null;
    this.onCorrect = null;
    this.onError = null;
  }

  /**
   * Start the puzzle sequence
   */
  start() {
    this.currentStage = 1;
    this.lastInteractionTime = Date.now();
    if (this.onStageChange) this.onStageChange(1);
  }

  /**
   * Handle object interaction from raycaster
   * @param {string} type - 'power', 'fader', 'turntable', 'drop', 'btn'
   * @param {number} index - element index
   * @param {Object} djConsole - DJConsole reference
   * @param {Object} audioEngine - AudioEngine reference
   */
  handleInteraction(type, index, djConsole, audioEngine) {
    this.lastInteractionTime = Date.now();

    switch (this.currentStage) {
      case 1:
        this._handleStage1(type, djConsole, audioEngine);
        break;
      case 2:
        this._handleStage2(type, index, djConsole, audioEngine);
        break;
      case 3:
        this._handleStage3(type, index, djConsole, audioEngine);
        break;
      case 4:
        this._handleStage4(type, djConsole, audioEngine);
        break;
    }
  }

  /**
   * Stage 1: POWER ON
   */
  _handleStage1(type, djConsole, audioEngine) {
    if (type === 'power') {
      djConsole.powerOn();
      audioEngine.playPowerOnSE();
      audioEngine.startAmbient();
      this._completeStage(1);
    }
  }

  /**
   * Stage 2: FREQUENCY MATCH
   * Player adjusts faders — checked in update loop
   */
  _handleStage2(type, index, djConsole, audioEngine) {
    if (type === 'fader') {
      audioEngine.playFaderSE(djConsole.faderValues[index]);
    }
  }

  /**
   * Stage 3: BEAT SYNC
   * Player clicks turntables in rhythm
   */
  _handleStage3(type, index, djConsole, audioEngine) {
    if (type === 'turntable') {
      const now = Date.now();
      this.beatSyncClicks.push(now);

      audioEngine.playClickSE();

      // Need at least 2 clicks to measure tempo
      if (this.beatSyncClicks.length >= 2) {
        const intervals = [];
        for (let i = 1; i < this.beatSyncClicks.length; i++) {
          intervals.push(this.beatSyncClicks[i] - this.beatSyncClicks[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const clickBPM = 60000 / avgInterval;

        // Check if close to target BPM
        if (Math.abs(clickBPM - this.targetBPM) < this.beatSyncTolerance) {
          this.beatSyncCorrectCount++;
          if (this.onCorrect) this.onCorrect('beat');

          if (this.beatSyncCorrectCount >= this.beatSyncRequired) {
            this._completeStage(3);
          }
        } else {
          // Reset if too far off
          if (this.beatSyncClicks.length > 4) {
            this.beatSyncClicks = this.beatSyncClicks.slice(-2);
            this.beatSyncCorrectCount = Math.max(0, this.beatSyncCorrectCount - 1);
            if (this.onError) this.onError();
          }
        }
      }

      // Keep only last 8 clicks
      if (this.beatSyncClicks.length > 8) {
        this.beatSyncClicks = this.beatSyncClicks.slice(-8);
      }
    }
  }

  /**
   * Stage 4: DROP TRIGGER
   */
  _handleStage4(type, djConsole, audioEngine) {
    if (type === 'drop') {
      audioEngine.playCorrectSE();
      this._completeStage(4);
    }
  }

  /**
   * Complete a stage and advance
   */
  _completeStage(stage) {
    this.stageCompleted[stage - 1] = true;

    if (stage < this.maxStages) {
      this.currentStage = stage + 1;
      if (this.onStageChange) this.onStageChange(this.currentStage);
      if (this.onCorrect) this.onCorrect('stage');
    } else {
      // All stages complete!
      this.isComplete = true;
      if (this.onComplete) this.onComplete();
    }
  }

  /**
   * Update (called every frame)
   * @param {number} dt - delta time
   * @param {Object} djConsole - DJConsole reference
   * @param {Object} audioEngine - AudioEngine reference
   */
  update(dt, djConsole, audioEngine) {
    if (this.isComplete || this.currentStage === 0) return;

    // Stage 2: Check if all faders match
    if (this.currentStage === 2 && djConsole.areFadersCorrect()) {
      audioEngine.playCorrectSE();
      this._completeStage(2);
    }

    // Hint system
    const timeSinceInteraction = (Date.now() - this.lastInteractionTime) / 1000;
    if (timeSinceInteraction > this.hintDelay && this.onHint) {
      this.onHint(this._getHint());
      this.lastInteractionTime = Date.now(); // reset to avoid spam
    }
  }

  /**
   * Get hint text for current stage
   */
  _getHint() {
    switch (this.currentStage) {
      case 1: return 'LOCATE THE POWER SWITCH... GREEN BUTTON ON THE LEFT';
      case 2: return 'ALIGN FREQUENCIES... WATCH THE LED INDICATORS';
      case 3: return `TAP THE TURNTABLE AT ${this.targetBPM} BPM... FEEL THE RHYTHM`;
      case 4: return 'ALL SYSTEMS ONLINE... INITIATE THE DROP';
      default: return '';
    }
  }

  /**
   * Get progress info
   */
  getProgress() {
    return {
      stage: this.currentStage,
      maxStages: this.maxStages,
      completed: this.stageCompleted,
      beatSyncProgress: this.beatSyncCorrectCount / this.beatSyncRequired,
      isComplete: this.isComplete,
    };
  }
}
