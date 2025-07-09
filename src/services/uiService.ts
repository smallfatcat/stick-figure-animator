import { Point } from '../types';
import { deepCopyPose } from '../utils/poseUtils';

export class UIService {
    constructor(private state: any) {} // Using any for now to maintain compatibility

    // Mouse position management
    setCurrentMousePos(pos: Point | null) {
        this.state.currentMousePos = pos;
    }

    getCurrentMousePos(): Point | null {
        return this.state.currentMousePos;
    }

    // Hover state management
    setHoveredThumbnailIndex(index: number | null) {
        this.state.hoveredThumbnailIndex = index;
    }

    setHoveredDeleteIconIndex(index: number | null) {
        this.state.hoveredDeleteIconIndex = index;
    }

    setHoveredScrollLeft(hovered: boolean) {
        this.state.hoveredScrollLeft = hovered;
    }

    setHoveredScrollRight(hovered: boolean) {
        this.state.hoveredScrollRight = hovered;
    }

    setHoveredGround(hovered: boolean) {
        this.state.hoveredGround = hovered;
    }

    setHoveredVerticalGuide(hovered: boolean) {
        this.state.hoveredVerticalGuide = hovered;
    }

    setHoveredMarkerIndex(index: number | null) {
        this.state.hoveredMarkerIndex = index;
    }

    setHoveredPlayhead(hovered: boolean) {
        this.state.hoveredPlayhead = hovered;
    }

    setHoveredJointKey(key: string | null) {
        this.state.hoveredJointKey = key;
    }

    // Scroll management
    setScrollOffset(offset: number) {
        this.state.scrollOffset = offset;
    }

    getScrollOffset(): number {
        return this.state.scrollOffset;
    }

    // Drop target management
    setDropTargetIndex(index: number | null) {
        this.state.dropTargetIndex = index;
    }

    getDropTargetIndex(): number | null {
        return this.state.dropTargetIndex;
    }

    // Keyframe selection
    selectKeyframe(index: number, layout: any) {
        if (this.state.keyframes[index]) {
            this.state.activeKeyframeIndex = index;
            this.state.stickFigurePose = deepCopyPose(this.state.keyframes[index].pose);
            this.state.animationProgress = this.state.keyframes[index].time;

            // Ensure the selected keyframe is visible in the timeline
            if (index < this.state.scrollOffset) {
                this.state.scrollOffset = index;
            } else if (index >= this.state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
                this.state.scrollOffset = index - layout.VISIBLE_THUMBNAILS + 1;
            }
        }
    }

    deselectKeyframe() {
        this.state.activeKeyframeIndex = null;
    }

    // Visual guide management
    setGroundY(y: number, maxY: number) {
        this.state.groundY = Math.max(0, Math.min(y, maxY));
    }

    getGroundY(): number {
        return this.state.groundY;
    }

    setVerticalGuideX(x: number, maxX: number) {
        this.state.verticalGuideX = Math.max(0, Math.min(x, maxX));
    }

    getVerticalGuideX(): number {
        return this.state.verticalGuideX;
    }

    // Utility methods
    isKeyframeActive(): boolean {
        return this.state.activeKeyframeIndex !== null;
    }

    getActiveKeyframeIndex(): number | null {
        return this.state.activeKeyframeIndex;
    }

    getKeyframeCount(): number {
        return this.state.keyframes.length;
    }

    isKeyframeAtIndex(index: number): boolean {
        return this.state.keyframes[index] !== undefined;
    }

    getKeyframeAt(index: number) {
        return this.state.keyframes[index];
    }

    // Scroll validation
    validateScrollOffset(layout: any): number {
        const maxOffset = Math.max(0, this.state.keyframes.length - layout.VISIBLE_THUMBNAILS);
        return Math.max(0, Math.min(this.state.scrollOffset, maxOffset));
    }
} 