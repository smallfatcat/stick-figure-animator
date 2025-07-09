export interface OnionState {
    isOnionModeEnabled: boolean;
    onionSkinBefore: number;
    onionSkinAfter: number;
    isFullOnionSkinEnabled: boolean;
    motionTrailResolution: number;
    onionTrailCanvas: HTMLCanvasElement | null;
}

export function createOnionState(): OnionState {
    return {
        isOnionModeEnabled: false,
        onionSkinBefore: 5,
        onionSkinAfter: 5,
        isFullOnionSkinEnabled: false,
        motionTrailResolution: 1,
        onionTrailCanvas: null,
    };
} 