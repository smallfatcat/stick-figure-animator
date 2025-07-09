import { StickFigurePoints } from '../types';

export interface IKState {
    isIKModeEnabled: boolean;
    draggedEndEffector: keyof StickFigurePoints | null;
}

export function createIKState(): IKState {
    return {
        isIKModeEnabled: false,
        draggedEndEffector: null,
    };
} 