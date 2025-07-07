
import { AppState } from './state';
import { DOMElements } from './dom';
import { icons } from './icons';

export function updateControlsState(dom: DOMElements, state: AppState) {
    dom.animateBtn.innerHTML = state.isAnimating ? icons.stop : icons.play;
    dom.animateBtn.title = state.isAnimating ? 'Stop Animation' : 'Animate';
    dom.animateBtn.disabled = state.keyframes.length < 2 && !state.isAnimating;

    dom.pauseBtn.innerHTML = state.isPaused ? icons.play : icons.pause;
    dom.pauseBtn.title = state.isPaused ? 'Resume' : 'Pause';
    dom.pauseBtn.disabled = !state.isAnimating;
    
    const isAtExistingKeyframe = state.keyframes.some(kf => {
        // Use a small epsilon for floating point comparison
        return Math.abs(kf.time - state.animationProgress) < 0.0001;
    });

    const isPausedDuringAnimation = state.isAnimating && state.isPaused;
    const isViewingStaticInterpolatedFrame = !state.isAnimating && state.activeKeyframeIndex === null && state.keyframes.length >= 2;
    
    const canInsert = isPausedDuringAnimation || state.isDraggingPlayhead || isViewingStaticInterpolatedFrame;

    dom.insertKeyframeBtn.disabled = !canInsert || isAtExistingKeyframe;

    dom.modeBtn.innerHTML = state.animationMode === 'loop' ? icons.loop : icons.pingpong;
    dom.modeBtn.title = `Mode: ${state.animationMode === 'loop' ? 'Loop' : 'Ping-Pong'}`;
    dom.modeBtn.disabled = state.keyframes.length < 2;

    const isOnionDisabled = state.isAnimating || state.activeKeyframeIndex === null;
    dom.onionBtn.disabled = isOnionDisabled;
    dom.onionBtn.classList.toggle('active', state.isOnionModeEnabled && !isOnionDisabled);
    dom.onionBeforeInput.disabled = isOnionDisabled;
    dom.onionAfterInput.disabled = isOnionDisabled;

    // Full animation trail button and its step input
    const isTrailDisabled = state.isAnimating;
    dom.fullOnionSkinBtn.disabled = isTrailDisabled;
    dom.fullOnionSkinBtn.classList.toggle('active', state.isFullOnionSkinEnabled && !isTrailDisabled);
    dom.motionTrailStepInput.disabled = isTrailDisabled;
    dom.motionTrailStepInput.value = state.motionTrailResolution.toString();

    dom.exportBtn.disabled = state.isAnimating || state.keyframes.length === 0;

    dom.importBtn.disabled = state.isAnimating;

    // Manage Time Display Mode UI
    dom.timeModeToggleBtn.disabled = state.isAnimating;
    dom.timeModeToggleBtn.textContent = state.timeDisplayMode === 'seconds' ? 'Use Frames' : 'Use Seconds';
    
    if (state.timeDisplayMode === 'seconds') {
        dom.durationLabel.textContent = 'Duration (s):';
        dom.durationInput.value = (state.animationTotalDuration / 1000).toFixed(1);
        dom.durationInput.step = '0.1';
        dom.durationInput.min = '0.1';

    } else { // frames
        const totalFrames = Math.round(state.animationTotalDuration / 1000 * 60);
        dom.durationLabel.textContent = 'Duration (f):';
        dom.durationInput.value = String(totalFrames);
        dom.durationInput.step = '1';
        dom.durationInput.min = '1';
    }
    dom.durationInput.disabled = state.isAnimating;
}