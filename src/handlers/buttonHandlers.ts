import { AppState } from '../state';
import { DOMElements } from '../dom';
import { RedrawFunction } from '../types';
import { startAnimation, stopAnimation, pauseAnimation, resumeAnimation } from '../animationLoop';
import { autoSaveCurrentPoseIfActive, addKeyframe, deleteKeyframe, insertKeyframeAtTime } from '../keyframeManager';
import { exportKeyframesAsJSON, loadKeyframesFromFile } from '../utils';
import { updatePoseForAnimationProgress } from '../animation';

export class ButtonHandler {
    constructor(
        private dom: DOMElements,
        private state: AppState,
        private updateUI: RedrawFunction,
        private redrawPosingCanvas: RedrawFunction,
        private redrawUICanvas: RedrawFunction,
        private kinematics: any,
        private layout: any,
        private posingCanvas: HTMLCanvasElement
    ) {}

    setupButtonHandlers() {
        this.setupAnimationButtons();
        this.setupKeyframeButtons();
        this.setupModeButtons();
        this.setupImportExportButtons();
        this.setupTimeDisplayButtons();
    }

    private setupAnimationButtons() {
        this.dom.animateBtn.addEventListener('click', () => {
            if (this.state.isAnimating) {
                stopAnimation(this.state, this.updateUI);
            } else if (this.state.keyframes.length >= 2) {
                autoSaveCurrentPoseIfActive(this.state);
                startAnimation(this.state, this.updateUI, this.redrawPosingCanvas, this.redrawUICanvas, this.kinematics, this.layout, this.posingCanvas);
            }
        });

        this.dom.pauseBtn.addEventListener('click', () => {
            if (!this.state.isAnimating) return;
            if (this.state.isPaused) {
                resumeAnimation(this.state, this.updateUI, this.redrawPosingCanvas, this.redrawUICanvas);
            } else {
                pauseAnimation(this.state, this.updateUI);
            }
        });
    }

    private setupKeyframeButtons() {
        this.dom.insertKeyframeBtn.addEventListener('click', () => {
            if (this.dom.insertKeyframeBtn.disabled) return;

            // The current state.stickFigurePose is the interpolated one we want to save.
            // insertKeyframeAtTime creates a deep copy of the pose.
            const newIndex = insertKeyframeAtTime(this.state, this.state.stickFigurePose, this.state.animationProgress);

            // Manually stop the animation state machine without resetting the main pose or active index.
            if (this.state.animationRequestId) {
                cancelAnimationFrame(this.state.animationRequestId);
            }
            this.state.animationRequestId = null;
            this.state.isAnimating = false;
            this.state.isPaused = false;
            
            // Set the new keyframe as the active one. The stickFigurePose is already correct.
            this.state.activeKeyframeIndex = newIndex;

            // Ensure thumbnail is visible in the scrollable timeline.
            if (this.state.activeKeyframeIndex < this.state.scrollOffset) {
                this.state.scrollOffset = this.state.activeKeyframeIndex;
            } else if (this.state.activeKeyframeIndex >= this.state.scrollOffset + this.layout.VISIBLE_THUMBNAILS) {
                this.state.scrollOffset = this.state.activeKeyframeIndex - this.layout.VISIBLE_THUMBNAILS + 1;
            }

            this.updateUI();
        });
    }

    private setupModeButtons() {
        this.dom.modeBtn.addEventListener('click', () => {
            if (this.state.keyframes.length < 2) return;
            this.state.animationMode = this.state.animationMode === 'loop' ? 'ping-pong' : 'loop';
            this.updateUI();
        });

        this.dom.ikModeBtn.addEventListener('click', () => {
            if (this.state.isAnimating) return;
            this.state.isIKModeEnabled = !this.state.isIKModeEnabled;
            this.state.draggedEndEffector = null; // Reset any active IK dragging
            this.updateUI();
        });

        this.dom.onionBtn.addEventListener('click', () => {
            if (this.state.isAnimating || this.state.activeKeyframeIndex === null) return;
            this.state.isOnionModeEnabled = !this.state.isOnionModeEnabled;
            this.updateUI();
        });

        this.dom.fullOnionSkinBtn.addEventListener('click', () => {
            if (this.dom.fullOnionSkinBtn.disabled) return;
            this.state.isFullOnionSkinEnabled = !this.state.isFullOnionSkinEnabled;
            this.updateUI();
        });
    }

    private setupImportExportButtons() {
        this.dom.exportBtn.addEventListener('click', () => {
            if (this.state.isAnimating || this.state.keyframes.length === 0) return;
            autoSaveCurrentPoseIfActive(this.state);
            exportKeyframesAsJSON(this.state.keyframes);
        });

        this.dom.importBtn.addEventListener('click', () => {
            if (this.state.isAnimating) return;
            this.dom.importInput.click();
        });

        this.dom.importInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    autoSaveCurrentPoseIfActive(this.state);
                    const loadedKfs = await loadKeyframesFromFile(file);
                    this.state.keyframes = loadedKfs;
                    this.state.scrollOffset = 0;
                    
                    if (this.state.keyframes.length > 0) {
                        this.state.activeKeyframeIndex = 0;
                        this.state.stickFigurePose = JSON.parse(JSON.stringify(this.state.keyframes[0].pose));
                        this.state.animationProgress = this.state.keyframes[0].time;
                    } else {
                        this.state.activeKeyframeIndex = null;
                        this.state.stickFigurePose = JSON.parse(JSON.stringify(this.kinematics.defaultPose));
                        this.state.animationProgress = 0;
                    }
                    
                    this.state.isOnionModeEnabled = false;
                    this.updateUI();
                } catch (error) {
                    alert("Failed to load keyframes. Please check the file format.");
                }
            }
            (e.target as HTMLInputElement).value = '';
        });
    }

    private setupTimeDisplayButtons() {
        this.dom.timeModeToggleBtn.addEventListener('click', () => {
            if (this.state.isAnimating) return;
            this.state.timeDisplayMode = this.state.timeDisplayMode === 'seconds' ? 'frames' : 'seconds';
            this.updateUI();
        });

        this.dom.durationInput.addEventListener('change', () => {
            if (this.state.timeDisplayMode === 'seconds') {
                const value = parseFloat(this.dom.durationInput.value);
                if (!isNaN(value) && value > 0) {
                    this.state.animationTotalDuration = value * 1000;
                } else {
                    alert("Invalid duration. Please enter a positive number.");
                }
            } else { // frames
                const frameValue = parseInt(this.dom.durationInput.value, 10);
                 if (!isNaN(frameValue) && frameValue > 0) {
                    this.state.animationTotalDuration = (frameValue / 60) * 1000;
                } else {
                    alert("Invalid duration. Please enter a positive integer for frames.");
                }
            }
            this.updateUI();
        });

        this.dom.motionTrailStepInput.addEventListener('change', () => {
            const value = parseInt(this.dom.motionTrailStepInput.value, 10);
            if (!isNaN(value) && value >= 1) {
                this.state.motionTrailResolution = value;
            } else {
                this.dom.motionTrailStepInput.value = this.state.motionTrailResolution.toString();
            }
        });

        this.dom.onionBeforeInput.addEventListener('change', () => {
            const value = parseInt(this.dom.onionBeforeInput.value, 10);
            if (!isNaN(value) && value >= 0) {
                this.state.onionSkinBefore = value;
                if (this.state.isOnionModeEnabled) this.updateUI();
            } else {
                this.dom.onionBeforeInput.value = this.state.onionSkinBefore.toString();
            }
        });

        this.dom.onionAfterInput.addEventListener('change', () => {
            const value = parseInt(this.dom.onionAfterInput.value, 10);
            if (!isNaN(value) && value >= 0) {
                this.state.onionSkinAfter = value;
                if (this.state.isOnionModeEnabled) this.updateUI();
            } else {
                this.dom.onionAfterInput.value = this.state.onionSkinAfter.toString();
            }
        });
    }
} 