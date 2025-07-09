import { StickFigurePoints } from '../types';

export interface DragState {
    draggedPointKey: keyof StickFigurePoints | null;
    isDraggingGround: boolean;
    isDraggingVerticalGuide: boolean;
    draggedMarkerIndex: number | null;
    isDraggingPlayhead: boolean;
    draggedThumbnailIndex: number | null;
    draggedEndEffector: keyof StickFigurePoints | null;
}

export function createDragState(): DragState {
    return {
        draggedPointKey: null,
        isDraggingGround: false,
        isDraggingVerticalGuide: false,
        draggedMarkerIndex: null,
        isDraggingPlayhead: false,
        draggedThumbnailIndex: null,
        draggedEndEffector: null,
    };
} 