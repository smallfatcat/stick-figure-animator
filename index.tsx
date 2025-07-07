
import './index.css';

import { getDOMElements } from './src/dom';
import { createAppState } from './src/state';
import { createLayout } from './src/ui';
import { createDefaultKinematics } from './src/kinematics';
import { redraw } from './src/renderer';
import { setupEventHandlers } from './src/eventHandlers';
import { icons } from './src/icons';
import { updateControlsState } from './src/controls';
import { RedrawFunction } from './src/types';

function main() {
    const dom = getDOMElements();
    const { canvas, insertKeyframeBtn, onionBtn, exportBtn, importBtn, fullOnionSkinBtn, ikModeBtn } = dom;

    canvas.width = 800;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    const layout = createLayout(canvas.width, canvas.height);
    const kinematics = createDefaultKinematics(canvas.width, layout.POSING_AREA_HEIGHT);
    
    const state = createAppState(kinematics, layout);

    // A lean, canvas-only redraw function for the high-frequency animation loop.
    const redrawCanvas: RedrawFunction = () => redraw(ctx, canvas, state, layout, kinematics, dom);
    
    // A full UI update function for user-initiated events.
    const updateUI: RedrawFunction = () => {
        updateControlsState(dom, state);
        redrawCanvas();
    };


    // Set initial static icons
    insertKeyframeBtn.innerHTML = icons.insert;
    onionBtn.innerHTML = icons.onion;
    fullOnionSkinBtn.innerHTML = icons.motionTrail;
    exportBtn.innerHTML = icons.export;
    importBtn.innerHTML = icons.import;
    ikModeBtn.innerHTML = icons.ik;

    setupEventHandlers(dom, state, layout, kinematics, updateUI, redrawCanvas);
    
    // Initial UI setup
    updateUI();
}

main();