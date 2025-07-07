import './index.css';

import { getDOMElements } from './src/dom';
import { createAppState } from './src/state';
import { createLayout } from './src/ui';
import { createDefaultKinematics } from './src/kinematics';
import { redraw } from './src/renderer';
import { setupEventHandlers } from './src/eventHandlers';

function main() {
    const dom = getDOMElements();
    const { canvas, durationInput } = dom;

    canvas.width = 800;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    const layout = createLayout(canvas.width, canvas.height);
    const kinematics = createDefaultKinematics(canvas.width, layout.POSING_AREA_HEIGHT);
    
    const state = createAppState(kinematics, layout);

    // Create a redraw function that has context closure, so we don't have to pass everything down every time.
    const redrawApp = () => redraw(ctx, canvas, state, layout, kinematics, dom);

    setupEventHandlers(dom, state, layout, kinematics, redrawApp);
    
    // Initial setup
    durationInput.value = (state.animationTotalDuration / 1000).toString();
    redrawApp();
}

main();
