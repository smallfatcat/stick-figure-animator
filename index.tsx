import './index.css';

import { getDOMElements } from './src/dom';
import { createRefactoredAppState, RefactoredAppState, createLegacyStateAdapter } from './src/state/refactoredState';
import { createLayout } from './src/ui';
import { createDefaultKinematics } from './src/kinematics';
import { redrawPosingCanvas, redrawUICanvas, updateCursor } from './src/renderer';
import { setupEventHandlers } from './src/handlers/eventHandlers';
import { icons } from './src/icons';
import { updateControlsState } from './src/controls';
import { RedrawFunction } from './src/types';
import { AnimationService } from './src/services/animationService';
import { KeyframeService } from './src/services/keyframeService';
import { UIService } from './src/services/uiService';

function main() {
    const dom = getDOMElements();
    const { posingCanvas, uiCanvas, insertKeyframeBtn, onionBtn, exportBtn, importBtn, fullOnionSkinBtn, ikModeBtn } = dom;

    posingCanvas.width = 800;
    posingCanvas.height = 540;
    const posingCtx = posingCanvas.getContext('2d');
    
    uiCanvas.width = 800;
    uiCanvas.height = 120;
    const uiCtx = uiCanvas.getContext('2d');

    if (!posingCtx || !uiCtx) { return; }

    const layout = createLayout(uiCanvas.width, uiCanvas.height, posingCanvas.height);
    const kinematics = createDefaultKinematics(posingCanvas.width, posingCanvas.height);
    
    // Use the new modular state
    const state: RefactoredAppState = createRefactoredAppState(kinematics, layout);
    
    // Create two-way adapter for legacy compatibility
    const legacyState = createLegacyStateAdapter(state);

    // Redraw functions using new state
    const redrawPosing = () => {
        redrawPosingCanvas(posingCtx, posingCanvas, legacyState, layout, kinematics);
    };
    const redrawUI = () => {
        redrawUICanvas(uiCtx, uiCanvas, legacyState, layout, kinematics);
    };

    // Instantiate services (after redraw functions are defined)
    const animationService = new AnimationService(state, redrawPosing, redrawPosing, redrawUI, kinematics, layout, posingCanvas);
    const keyframeService = new KeyframeService(state);
    const uiService = new UIService(state);

    // Update UI using new state and services
    const updateUI: RedrawFunction = () => {
        updateControlsState(dom, legacyState);
        redrawPosing();
        redrawUI();
        updateCursor(posingCanvas, uiCanvas, legacyState);
    };

    // Set initial static icons
    insertKeyframeBtn.innerHTML = icons.insert;
    onionBtn.innerHTML = icons.onion;
    fullOnionSkinBtn.innerHTML = icons.motionTrail;
    exportBtn.innerHTML = icons.export;
    importBtn.innerHTML = icons.import;
    ikModeBtn.innerHTML = icons.ik;

    // Pass new state and services to handlers
    setupEventHandlers(dom, legacyState, layout, kinematics, updateUI, redrawPosing, redrawUI);
    
    // Initial UI setup
    updateUI();
}

main();