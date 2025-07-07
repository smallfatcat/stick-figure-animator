export interface DOMElements {
    canvas: HTMLCanvasElement;
    importInput: HTMLInputElement;
    durationInput: HTMLInputElement;
    animateBtn: HTMLButtonElement;
    pauseBtn: HTMLButtonElement;
    modeBtn: HTMLButtonElement;
    onionBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    importBtn: HTMLButtonElement;
}

export function getDOMElements(): DOMElements {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const importInput = document.getElementById('import-input') as HTMLInputElement;
    const durationInput = document.getElementById('duration-input') as HTMLInputElement;
    const animateBtn = document.getElementById('animate-btn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    const modeBtn = document.getElementById('mode-btn') as HTMLButtonElement;
    const onionBtn = document.getElementById('onion-btn') as HTMLButtonElement;
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement;

    if (!canvas || !importInput || !durationInput || !animateBtn || !pauseBtn || !modeBtn || !onionBtn || !exportBtn || !importBtn) {
        throw new Error("Could not find all required DOM elements.");
    }

    return { canvas, importInput, durationInput, animateBtn, pauseBtn, modeBtn, onionBtn, exportBtn, importBtn };
}
