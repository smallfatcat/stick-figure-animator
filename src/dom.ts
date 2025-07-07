
export interface DOMElements {
    canvas: HTMLCanvasElement;
    importInput: HTMLInputElement;
    durationInput: HTMLInputElement;
    durationLabel: HTMLLabelElement;
    timeModeToggleBtn: HTMLButtonElement;
    animateBtn: HTMLButtonElement;
    pauseBtn: HTMLButtonElement;
    insertKeyframeBtn: HTMLButtonElement;
    modeBtn: HTMLButtonElement;
    ikModeBtn: HTMLButtonElement;
    onionBtn: HTMLButtonElement;
    fullOnionSkinBtn: HTMLButtonElement;
    motionTrailStepInput: HTMLInputElement;
    exportBtn: HTMLButtonElement;
    importBtn: HTMLButtonElement;
    onionBeforeInput: HTMLInputElement;
    onionAfterInput: HTMLInputElement;
}

export function getDOMElements(): DOMElements {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const importInput = document.getElementById('import-input') as HTMLInputElement;
    const durationInput = document.getElementById('duration-input') as HTMLInputElement;
    const durationLabel = document.getElementById('duration-label') as HTMLLabelElement;
    const timeModeToggleBtn = document.getElementById('time-mode-toggle-btn') as HTMLButtonElement;
    const animateBtn = document.getElementById('animate-btn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    const insertKeyframeBtn = document.getElementById('insert-keyframe-btn') as HTMLButtonElement;
    const modeBtn = document.getElementById('mode-btn') as HTMLButtonElement;
    const ikModeBtn = document.getElementById('ik-mode-btn') as HTMLButtonElement;
    const onionBtn = document.getElementById('onion-btn') as HTMLButtonElement;
    const fullOnionSkinBtn = document.getElementById('full-onion-skin-btn') as HTMLButtonElement;
    const motionTrailStepInput = document.getElementById('motion-trail-step-input') as HTMLInputElement;
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    const onionBeforeInput = document.getElementById('onion-before-input') as HTMLInputElement;
    const onionAfterInput = document.getElementById('onion-after-input') as HTMLInputElement;

    if (!canvas || !importInput || !durationInput || !durationLabel || !timeModeToggleBtn || !animateBtn || !pauseBtn || !insertKeyframeBtn || !modeBtn || !ikModeBtn || !onionBtn || !fullOnionSkinBtn || !motionTrailStepInput || !exportBtn || !importBtn || !onionBeforeInput || !onionAfterInput) {
        throw new Error("Could not find all required DOM elements.");
    }

    return { canvas, importInput, durationInput, durationLabel, timeModeToggleBtn, animateBtn, pauseBtn, insertKeyframeBtn, modeBtn, ikModeBtn, onionBtn, fullOnionSkinBtn, motionTrailStepInput, exportBtn, importBtn, onionBeforeInput, onionAfterInput };
}