import { AppState } from './state';
import { getPoseAtProgress, updatePoseForAnimationProgress } from './animation';
import { RedrawFunction } from './types';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { Layout } from './ui';
import { drawStickFigure } from './drawing';

/**
 * Pre-renders all interpolated frames of an animation onto an offscreen canvas
 * for performant "motion trail" or "full onion skin" effect.
 */
function generateOnionTrail(state: AppState, kinematics: KinematicsData, canvas: HTMLCanvasElement, layout: Layout) {
    if (!state.isFullOnionSkinEnabled || state.keyframes.length < 2) {
        state.onionTrailCanvas = null;
        return;
    }

    const trailCanvas = document.createElement('canvas');
    trailCanvas.width = canvas.width;
    trailCanvas.height = layout.POSING_AREA_HEIGHT;
    const trailCtx = trailCanvas.getContext('2d');
    if (!trailCtx) {
        state.onionTrailCanvas = null;
        return;
    }

    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    const totalFrames = Math.floor((state.animationTotalDuration / 1000) * 60);
    // A trail needs at least 2 frames to be meaningful and to avoid division by zero later.
    if (totalFrames < 2) { 
        state.onionTrailCanvas = null;
        return;
    }

    const step = state.motionTrailResolution;
    const framesToDraw = Math.floor(totalFrames / step);

    // Don't draw if step size is larger than the number of frames
    if (framesToDraw <= 0) {
        state.onionTrailCanvas = null;
        return;
    }

    // Adjust opacity based on the number of frames being drawn so it looks consistent.
    const opacity = Math.max(0.01, Math.min(0.25, 15 / framesToDraw));
    const style = `rgba(200, 225, 255, ${opacity})`;

    for (let i = 0; i < totalFrames; i += step) {
        const progress = i / (totalFrames - 1); // This is now safe from 0/0
        const pose = getPoseAtProgress(progress, state.keyframes);
        if (pose) {
            const points = calculatePointsFromPose(pose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
            drawStickFigure(trailCtx, points, { strokeStyle: style, fillStyle: style });
        }
    }
    state.onionTrailCanvas = trailCanvas;
}


function animateLoop(
    timestamp: number, 
    state: AppState, 
    redrawPosingCanvas: RedrawFunction,
    redrawUICanvas: RedrawFunction
) {
    if (!state.isAnimating || state.animationStartTime === null || state.keyframes.length < 2) {
        // The stop function will handle the UI update.
        return;
    }

    const cycleDuration = state.animationMode === 'ping-pong' ? state.animationTotalDuration * 2 : state.animationTotalDuration;
    const cycleTime = (timestamp - state.animationStartTime) % cycleDuration;

    let globalTime: number; // Normalized 0 to 1
    if (state.animationMode === 'ping-pong') {
        if (cycleTime > state.animationTotalDuration) { // Playing backwards
            globalTime = (state.animationTotalDuration - (cycleTime - state.animationTotalDuration)) / state.animationTotalDuration;
        } else { // Playing forwards
            globalTime = cycleTime / state.animationTotalDuration;
        }
    } else { // Loop
        globalTime = cycleTime / state.animationTotalDuration;
    }

    state.animationProgress = globalTime;
    updatePoseForAnimationProgress(state);
    
    redrawPosingCanvas();
    redrawUICanvas();
    
    if (state.isAnimating) {
        state.animationRequestId = requestAnimationFrame((ts) => animateLoop(ts, state, redrawPosingCanvas, redrawUICanvas));
    }
}

export function startAnimation(
    state: AppState, 
    updateUI: RedrawFunction, 
    redrawPosingCanvas: RedrawFunction, 
    redrawUICanvas: RedrawFunction,
    kinematics: KinematicsData, 
    layout: Layout, 
    canvas: HTMLCanvasElement
) {
    if (state.keyframes.length < 2) return;
    
    generateOnionTrail(state, kinematics, canvas, layout);

    state.isAnimating = true;
    state.isPaused = false;
    state.timeElapsedBeforePause = 0;
    state.animationStartTime = performance.now();
    
    state.activeKeyframeIndexBeforeAnimation = state.activeKeyframeIndex;
    state.activeKeyframeIndex = null; 

    updateUI(); // Update controls to "Stop", etc. once.
    state.animationRequestId = requestAnimationFrame((ts) => animateLoop(ts, state, redrawPosingCanvas, redrawUICanvas));
}

export function stopAnimation(state: AppState, updateUI: RedrawFunction) {
    if (state.animationRequestId) cancelAnimationFrame(state.animationRequestId);
    state.animationRequestId = null;
    state.isAnimating = false;
    state.isPaused = false;
    state.onionTrailCanvas = null; // Clean up the trail canvas
    
    state.activeKeyframeIndex = state.activeKeyframeIndexBeforeAnimation;

    if (state.activeKeyframeIndex !== null && state.keyframes[state.activeKeyframeIndex]) {
        state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.activeKeyframeIndex].pose));
        state.animationProgress = state.keyframes[state.activeKeyframeIndex].time;
    } else if (state.keyframes.length > 0) {
        state.activeKeyframeIndex = 0;
        state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[0].pose));
        state.animationProgress = state.keyframes[0].time;
    } else {
        state.animationProgress = 0;
    }

    updateUI();
}

export function pauseAnimation(state: AppState, updateUI: RedrawFunction) {
    if (!state.isAnimating || state.isPaused) return;
    if (state.animationRequestId) cancelAnimationFrame(state.animationRequestId);
    state.animationRequestId = null;
    state.isPaused = true;
    if (state.animationStartTime) {
        state.timeElapsedBeforePause = performance.now() - state.animationStartTime;
    }
    updateUI();
}

export function resumeAnimation(
    state: AppState, 
    updateUI: RedrawFunction, 
    redrawPosingCanvas: RedrawFunction,
    redrawUICanvas: RedrawFunction
) {
    if (!state.isAnimating || !state.isPaused) return;
    state.isPaused = false;
    if (state.animationStartTime) {
        state.animationStartTime = performance.now() - state.timeElapsedBeforePause;
    }
    updateUI(); // Update controls to "Pause", etc. once.
    state.animationRequestId = requestAnimationFrame((ts) => animateLoop(ts, state, redrawPosingCanvas, redrawUICanvas));
}