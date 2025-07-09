export interface AnimationState {
    isAnimating: boolean;
    isPaused: boolean;
    animationMode: 'loop' | 'ping-pong';
    animationRequestId: number | null;
    animationStartTime: number | null;
    timeElapsedBeforePause: number;
    animationTotalDuration: number;
    animationProgress: number;
    timeDisplayMode: 'seconds' | 'frames';
    activeKeyframeIndexBeforeAnimation: number | null;
}

export function createAnimationState(): AnimationState {
    return {
        isAnimating: false,
        isPaused: false,
        animationMode: 'loop',
        animationRequestId: null,
        animationStartTime: null,
        timeElapsedBeforePause: 0,
        animationTotalDuration: 5000,
        animationProgress: 0,
        timeDisplayMode: 'seconds',
        activeKeyframeIndexBeforeAnimation: null,
    };
} 