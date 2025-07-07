import { AppState } from './state';
import { interpolatePose } from './animation';

type RedrawFunction = () => void;

function animateLoop(timestamp: number, state: AppState, redraw: RedrawFunction) {
    if (!state.isAnimating || state.animationStartTime === null || state.keyframes.length < 2) {
        stopAnimation(state, redraw);
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

    let sourceFrameIndex = -1;
    for (let i = 0; i < state.keyframes.length - 1; i++) {
        if (globalTime >= state.keyframes[i].time && globalTime <= state.keyframes[i+1].time) {
            sourceFrameIndex = i;
            break;
        }
    }
    if (sourceFrameIndex === -1) {
        // If outside all segments, hold the last pose
        state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.keyframes.length - 1].pose));
    } else {
        const targetFrameIndex = sourceFrameIndex + 1;
        const sourceFrame = state.keyframes[sourceFrameIndex];
        const targetFrame = state.keyframes[targetFrameIndex];

        const segmentDuration = targetFrame.time - sourceFrame.time;
        const timeIntoSegment = globalTime - sourceFrame.time;
        
        const progress = (segmentDuration === 0) ? 1 : Math.min(1, timeIntoSegment / segmentDuration);

        state.stickFigurePose = interpolatePose(sourceFrame.pose, targetFrame.pose, progress);
    }
    
    redraw();
    
    if (state.isAnimating) {
        state.animationRequestId = requestAnimationFrame((ts) => animateLoop(ts, state, redraw));
    }
}

export function startAnimation(state: AppState, redraw: RedrawFunction) {
    if (state.keyframes.length < 2) return;
    state.isAnimating = true;
    state.isPaused = false;
    state.timeElapsedBeforePause = 0;
    state.animationStartTime = performance.now();
    
    state.activeKeyframeIndexBeforeAnimation = state.activeKeyframeIndex;
    state.activeKeyframeIndex = null; 

    state.animationRequestId = requestAnimationFrame((ts) => animateLoop(ts, state, redraw));
}

export function stopAnimation(state: AppState, redraw: RedrawFunction) {
    if (state.animationRequestId) cancelAnimationFrame(state.animationRequestId);
    state.animationRequestId = null;
    state.isAnimating = false;
    state.isPaused = false;
    state.animationProgress = null;
    
    state.activeKeyframeIndex = state.activeKeyframeIndexBeforeAnimation;

    if (state.activeKeyframeIndex !== null && state.keyframes[state.activeKeyframeIndex]) {
        state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.activeKeyframeIndex].pose));
    } else if (state.keyframes.length > 0) {
        state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[0].pose));
    }

    redraw();
}

export function pauseAnimation(state: AppState, redraw: RedrawFunction) {
    if (!state.isAnimating || state.isPaused) return;
    if (state.animationRequestId) cancelAnimationFrame(state.animationRequestId);
    state.animationRequestId = null;
    state.isPaused = true;
    if (state.animationStartTime) {
        state.timeElapsedBeforePause = performance.now() - state.animationStartTime;
    }
    redraw();
}

export function resumeAnimation(state: AppState, redraw: RedrawFunction) {
    if (!state.isAnimating || !state.isPaused) return;
    state.isPaused = false;
    if (state.animationStartTime) {
        state.animationStartTime = performance.now() - state.timeElapsedBeforePause;
    }
    state.animationRequestId = requestAnimationFrame((ts) => animateLoop(ts, state, redraw));
}
