import './index.css';

import { getDOMElements } from './src/dom';
import { createAppState } from './src/state';
import { createLayout } from './src/ui';
import { createDefaultKinematics } from './src/kinematics';
import { redrawPosingCanvas, redrawUICanvas, updateCursor } from './src/renderer';
import { setupEventHandlers } from './src/eventHandlers';
import { icons } from './src/icons';
import { updateControlsState } from './src/controls';
import { RedrawFunction } from './src/types';

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
    
    const state = createAppState(kinematics, layout);

    const redrawPosing = () => redrawPosingCanvas(posingCtx, posingCanvas, state, layout, kinematics);
    const redrawUI = () => redrawUICanvas(uiCtx, uiCanvas, state, layout, kinematics);
    
    const updateUI: RedrawFunction = () => {
        updateControlsState(dom, state);
        redrawPosing();
        redrawUI();
        updateCursor(posingCanvas, uiCanvas, state);
    };


    // Set initial static icons
    insertKeyframeBtn.innerHTML = icons.insert;
    onionBtn.innerHTML = icons.onion;
    fullOnionSkinBtn.innerHTML = icons.motionTrail;
    exportBtn.innerHTML = icons.export;
    importBtn.innerHTML = icons.import;
    ikModeBtn.innerHTML = icons.ik;

    setupEventHandlers(dom, state, layout, kinematics, updateUI, redrawPosing, redrawUI);
    
    // Initial UI setup
    updateUI();
}

main();