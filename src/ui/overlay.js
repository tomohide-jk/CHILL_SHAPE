/**
 * REBOOT_GATE — UI Overlay
 * Motion-powered UI animations and HUD management
 */
import { animate } from 'motion';

export class Overlay {
  constructor() {
    // DOM Elements
    this.titleScreen = document.getElementById('title-screen');
    this.titleLogo = document.getElementById('title-logo');
    this.titleSubtitle = document.getElementById('title-subtitle');
    this.startButton = document.getElementById('start-button');
    this.hud = document.getElementById('hud');
    this.stageNumber = document.getElementById('stage-number');
    this.stageIndicator = document.getElementById('stage-indicator');
    this.hintContainer = document.getElementById('hint-container');
    this.hintText = document.getElementById('hint-text');
    this.escapeOverlay = document.getElementById('escape-overlay');
    this.escapeFlash = document.getElementById('escape-flash');
    this.escapeText = document.getElementById('escape-text');
    this.escapeSubtitle = document.getElementById('escape-subtitle');
    this.vizCanvas = document.getElementById('viz-canvas');
    this.vizCtx = this.vizCanvas ? this.vizCanvas.getContext('2d') : null;

    // State
    this.isStarted = false;
    this.onStart = null;
    this.hintTimeout = null;

    this._initTitleAnimations();
    this._bindEvents();
  }

  _initTitleAnimations() {
    // Animate title logo entrance
    if (this.titleLogo) {
      animate(this.titleLogo, {
        opacity: [0, 1],
        y: [30, 0],
      }, {
        duration: 1.2,
        easing: 'ease-out',
      });
    }

    if (this.titleSubtitle) {
      animate(this.titleSubtitle, {
        opacity: [0, 0.5],
      }, {
        duration: 1.5,
        delay: 0.5,
        easing: 'ease-out',
      });
    }

    if (this.startButton) {
      animate(this.startButton, {
        opacity: [0, 1],
        scale: [0.8, 1],
      }, {
        duration: 0.6,
        delay: 1,
        easing: [0.34, 1.56, 0.64, 1], // spring-like overshoot
      });
    }
  }

  _bindEvents() {
    if (this.startButton) {
      this.startButton.addEventListener('click', () => this._handleStart());
    }
  }

  _handleStart() {
    if (this.isStarted) return;
    this.isStarted = true;

    // Animate title screen out
    if (this.titleScreen) {
      animate(this.titleScreen, {
        opacity: [1, 0],
        scale: [1, 1.05],
      }, {
        duration: 0.6,
        easing: 'ease-in',
      }).then(() => {
        this.titleScreen.classList.add('hidden');
      });
    }

    // Show HUD
    setTimeout(() => {
      if (this.hud) {
        this.hud.classList.remove('hidden');
        animate(this.hud, {
          opacity: [0, 1],
        }, {
          duration: 0.5,
          easing: 'ease-out',
        });
      }

      // Animate stage indicator in
      if (this.stageIndicator) {
        animate(this.stageIndicator, {
          opacity: [0, 1],
          scale: [0.8, 1],
          y: [-20, 0],
        }, {
          duration: 0.5,
          easing: [0.34, 1.56, 0.64, 1],
        });
      }
    }, 400);

    if (this.onStart) this.onStart();
  }

  /**
   * Update stage indicator
   */
  setStage(stage) {
    if (!this.stageNumber) return;

    // Animate stage number change
    animate(this.stageIndicator, {
      scale: [1, 1.2, 1],
    }, {
      duration: 0.4,
      easing: [0.34, 1.56, 0.64, 1],
    });

    // Flash effect
    animate(this.stageNumber, {
      opacity: [0.3, 1],
    }, {
      duration: 0.3,
    });

    this.stageNumber.textContent = stage;
  }

  /**
   * Show hint text with glitch effect
   */
  showHint(text) {
    if (!this.hintContainer || !this.hintText) return;

    this.hintText.textContent = text;
    this.hintText.setAttribute('data-text', text);
    this.hintContainer.classList.remove('hidden');

    animate(this.hintContainer, {
      opacity: [0, 1],
      y: [10, 0],
    }, {
      duration: 0.4,
      easing: 'ease-out',
    });

    // Auto-hide after 5 seconds
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => this.hideHint(), 5000);
  }

  hideHint() {
    if (!this.hintContainer) return;

    animate(this.hintContainer, {
      opacity: [1, 0],
    }, {
      duration: 0.3,
    }).then(() => {
      this.hintContainer.classList.add('hidden');
    });
  }

  /**
   * Show stage completion feedback
   */
  showStageClear() {
    if (!this.stageIndicator) return;

    // Big pulse on stage indicator
    animate(this.stageIndicator, {
      scale: [1, 1.4, 1],
      borderColor: ['rgba(0, 243, 255, 0.3)', 'rgba(0, 243, 255, 0.9)', 'rgba(0, 243, 255, 0.3)'],
    }, {
      duration: 0.6,
      easing: 'ease-out',
    });
  }

  /**
   * Update audio visualizer canvas
   */
  updateVisualizer(frequencyData) {
    if (!this.vizCtx || !frequencyData) return;

    const ctx = this.vizCtx;
    const w = this.vizCanvas.width;
    const h = this.vizCanvas.height;

    // Clear
    ctx.fillStyle = 'rgba(5, 5, 5, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // Draw waveform
    const barCount = 64;
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * frequencyData.length / barCount);
      const value = (frequencyData[dataIndex] || 0) / 255;
      const barHeight = value * h;

      const hue = 180 + (i / barCount) * 130;
      ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${0.4 + value * 0.6})`;
      ctx.fillRect(i * barWidth, h - barHeight, barWidth - 0.5, barHeight);
    }
  }

  /**
   * Start escape sequence overlay
   */
  async startEscapeSequence() {
    if (!this.escapeOverlay) return;

    // Hide HUD
    if (this.hud) {
      animate(this.hud, { opacity: 0 }, { duration: 0.5 });
    }

    this.escapeOverlay.classList.remove('hidden');

    // Flash white
    await animate(this.escapeFlash, {
      opacity: [0, 1],
    }, {
      duration: 2,
      easing: 'ease-in',
    }).finished;

    // Show text on white background
    await animate(this.escapeText, {
      opacity: [0, 1],
      scale: [0.8, 1],
    }, {
      duration: 0.8,
      delay: 0.3,
      easing: [0.34, 1.56, 0.64, 1],
    }).finished;

    // Show subtitle
    animate(this.escapeSubtitle, {
      opacity: [0, 1],
    }, {
      duration: 1,
      delay: 0.5,
      easing: 'ease-out',
    });
  }

  dispose() {
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
  }
}
