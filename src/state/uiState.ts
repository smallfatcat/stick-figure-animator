import { Point } from '../types';

export interface UIState {
    currentMousePos: Point | null;
    hoveredThumbnailIndex: number | null;
    hoveredDeleteIconIndex: number | null;
    hoveredScrollLeft: boolean;
    hoveredScrollRight: boolean;
    hoveredGround: boolean;
    hoveredVerticalGuide: boolean;
    hoveredMarkerIndex: number | null;
    hoveredPlayhead: boolean;
    hoveredJointKey: string | null;
    scrollOffset: number;
    dropTargetIndex: number | null;
}

export function createUIState(): UIState {
    return {
        currentMousePos: null,
        hoveredThumbnailIndex: null,
        hoveredDeleteIconIndex: null,
        hoveredScrollLeft: false,
        hoveredScrollRight: false,
        hoveredGround: false,
        hoveredVerticalGuide: false,
        hoveredMarkerIndex: null,
        hoveredPlayhead: false,
        hoveredJointKey: null,
        scrollOffset: 0,
        dropTargetIndex: null,
    };
} 