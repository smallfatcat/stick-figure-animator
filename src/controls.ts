import { AppState } from './state';
import { DOMElements } from './dom';

export function updateControlsState(dom: DOMElements, state: AppState) {
    dom.animateBtn.textContent = state.isAnimating ? 'Stop' : 'Animate';
    dom.animateBtn.disabled = state.keyframes.length < 2 && !state.isAnimating;

    dom.pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
    dom.pauseBtn.disabled = !state.isAnimating;
    
    dom.modeBtn.textContent = state.animationMode === 'loop' ? 'Loop' : 'Ping-Pong';
    dom.modeBtn.disabled = state.isAnimating || state.keyframes.length < 2;

    dom.onionBtn.disabled = state.isAnimating || state.activeKeyframeIndex === null;
    dom.onionBtn.classList.toggle('active', state.isOnionModeEnabled);

    dom.exportBtn.disabled = state.isAnimating || state.keyframes.length === 0;

    dom.importBtn.disabled = state.isAnimating;

    dom.durationInput.disabled = state.isAnimating;
}
