import { AnimationState } from '../state/animationState';
import { RedrawFunction } from '../types';
import { KinematicsData } from '../kinematics';
import { Layout } from '../ui';
import { startAnimation, stopAnimation, pauseAnimation, resumeAnimation } from '../animationLoop';
import { updatePoseForAnimationProgress } from '../animation';

export class AnimationService {
    constructor(
        private state: any, // Using any for now to maintain compatibility with existing functions
        private updateUI: RedrawFunction,
        private redrawPosingCanvas: RedrawFunction,
        private redrawUICanvas: RedrawFunction,
        private kinematics: KinematicsData,
        private layout: Layout,
        private posingCanvas: HTMLCanvasElement
    ) {}

    start() {
        if (this.state.keyframes.length < 2) return;
        
        startAnimation(
            this.state, 
            this.updateUI, 
            this.redrawPosingCanvas, 
            this.redrawUICanvas, 
            this.kinematics, 
            this.layout, 
            this.posingCanvas
        );
    }

    stop() {
        stopAnimation(this.state, this.updateUI);
    }

    pause() {
        if (!this.state.isAnimating || this.state.isPaused) return;
        pauseAnimation(this.state, this.updateUI);
    }

    resume() {
        if (!this.state.isAnimating || !this.state.isPaused) return;
        resumeAnimation(this.state, this.updateUI, this.redrawPosingCanvas, this.redrawUICanvas);
    }

    toggleMode() {
        this.state.animationMode = this.state.animationMode === 'loop' ? 'ping-pong' : 'loop';
    }

    setDuration(duration: number, mode: 'seconds' | 'frames') {
        if (mode === 'seconds') {
            this.state.animationTotalDuration = duration * 1000;
        } else {
            this.state.animationTotalDuration = (duration / 60) * 1000;
        }
    }

    setTimeDisplayMode(mode: 'seconds' | 'frames') {
        this.state.timeDisplayMode = mode;
    }

    updateProgress(progress: number) {
        this.state.animationProgress = progress;
        updatePoseForAnimationProgress(this.state);
    }

    isAnimating(): boolean {
        return this.state.isAnimating;
    }

    isPaused(): boolean {
        return this.state.isPaused;
    }

    getAnimationMode(): 'loop' | 'ping-pong' {
        return this.state.animationMode;
    }

    getProgress(): number {
        return this.state.animationProgress;
    }

    getDuration(): number {
        return this.state.animationTotalDuration;
    }

    getTimeDisplayMode(): 'seconds' | 'frames' {
        return this.state.timeDisplayMode;
    }
} 