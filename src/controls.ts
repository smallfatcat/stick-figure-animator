import { AppState } from './state';
import { DOMElements } from './dom';

export function updateControlsState(dom: DOMElements, state: AppState) {
    dom.animateBtn.textContent = state.isAnimating ? 'Stop' : 'Animate';
    dom.animateBtn.disabled = state.keyframes.length < 2 && !state.isAnimating;

    dom.pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
    dom.pauseBtn.disabled = !state.isAnimating;
    
    const isAtExistingKeyframe = state.keyframes.some(kf => {
        // Use a small epsilon for floating point comparison
        return Math.abs(kf.time - state.animationProgress) < 0.0001;
    });

    const isPausedDuringAnimation = state.isAnimating && state.isPaused;
    // This new condition captures the state after the user has finished dragging the playhead.
    // In this state, no keyframe is active, and the app is not animating.
    const isViewingStaticInterpolatedFrame = !state.isAnimating && state.activeKeyframeIndex === null && state.keyframes.length >= 2;
    
    const canInsert = isPausedDuringAnimation || state.isDraggingPlayhead || isViewingStaticInterpolatedFrame;

    dom.insertKeyframeBtn.disabled = !canInsert || isAtExistingKeyframe;

    dom.modeBtn.textContent = state.animationMode === 'loop' ? 'Loop' : 'PP';
    dom.modeBtn.disabled = state.isAnimating || state.keyframes.length < 2;

    const isOnionDisabled = state.isAnimating || state.activeKeyframeIndex === null;
    dom.onionBtn.disabled = isOnionDisabled;
    dom.onionBtn.classList.toggle('active', state.isOnionModeEnabled);
    dom.onionBeforeInput.disabled = isOnionDisabled;
    dom.onionAfterInput.disabled = isOnionDisabled;

    dom.exportBtn.disabled = state.isAnimating || state.keyframes.length === 0;

    dom.importBtn.disabled = state.isAnimating;

    dom.durationInput.disabled = state.isAnimating;
}