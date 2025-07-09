import { AppState } from '../state';
import { DOMElements } from '../dom';
import { Layout } from '../ui';
import { KinematicsData, calculatePointsFromPose } from '../kinematics';
import { getMousePos, isInside } from '../utils';
import { Rect, StickFigurePoints, RedrawFunction, Keyframe } from '../types';
import { updatePoseForAnimationProgress } from '../animation';
import { solveIKForEndEffector, isEndEffector } from '../inverseKinematics';
import { checkHoveringJoint } from '../drawing';
import { autoSaveCurrentPoseIfActive, addKeyframe, deleteKeyframe, renormalizeKeyframeTimes } from '../keyframeManager';
import { getTimelineMarkerRect } from '../ui';

export class MouseHandler {
    private grabRadius = 15;
    private GUIDE_GRAB_BUFFER = 10;

    constructor(
        private dom: DOMElements,
        private state: AppState,
        private layout: Layout,
        private kinematics: KinematicsData,
        private updateUI: RedrawFunction,
        private redrawPosingCanvas: RedrawFunction,
        private redrawUICanvas: RedrawFunction
    ) {}

    setupMouseHandlers() {
        this.setupPosingCanvasMouseHandlers();
        this.setupUICanvasMouseHandlers();
        this.setupGlobalMouseHandlers();
        this.setupKeyboardHandlers();
    }

    private setupPosingCanvasMouseHandlers() {
        const { posingCanvas } = this.dom;
        const { hierarchy, boneLengths, children } = this.kinematics;

        // MOUSE DOWN
        posingCanvas.addEventListener('mousedown', (e) => {
            const mousePos = getMousePos(posingCanvas, e);
            if (this.state.isAnimating && !this.state.isPaused) return;

            const horizontalGrabberRect: Rect = { 
                x: 0, 
                y: this.state.groundY - this.GUIDE_GRAB_BUFFER, 
                width: this.layout.GUIDE_GRABBER_SIZE, 
                height: this.GUIDE_GRAB_BUFFER * 2 
            };
            if (isInside(mousePos, horizontalGrabberRect) && mousePos.y < this.layout.POSING_AREA_HEIGHT) {
                this.state.isDraggingGround = true;
                return;
            }

            const verticalGrabberRect: Rect = { 
                x: this.state.verticalGuideX - this.GUIDE_GRAB_BUFFER, 
                y: this.layout.POSING_AREA_HEIGHT - this.layout.GUIDE_GRABBER_SIZE, 
                width: this.GUIDE_GRAB_BUFFER * 2, 
                height: this.layout.GUIDE_GRABBER_SIZE 
            };
            if (isInside(mousePos, verticalGrabberRect) && mousePos.y < this.layout.POSING_AREA_HEIGHT) {
                this.state.isDraggingVerticalGuide = true;
                return;
            }

            const currentPoints = calculatePointsFromPose(this.state.stickFigurePose, hierarchy, boneLengths, children);
            const clickedJoint = checkHoveringJoint(currentPoints, this.grabRadius, mousePos, this.state.isIKModeEnabled);

            if (clickedJoint) {
                // A joint was clicked. If no keyframe is active, create one.
                if (this.state.activeKeyframeIndex === null) {
                    this.addKeyframe();
                    this.updateUI();
                }
                // Set the appropriate drag state.
                if (this.state.isIKModeEnabled && isEndEffector(clickedJoint)) {
                    this.state.draggedEndEffector = clickedJoint;
                } else {
                    this.state.draggedPointKey = clickedJoint;
                }
            } else if (mousePos.y < this.layout.POSING_AREA_HEIGHT) {
                // An empty area was clicked, create a new keyframe.
                this.addKeyframe();
                this.updateUI();
            }
        });

        // MOUSE MOVE
        posingCanvas.addEventListener('mousemove', (e) => {
            const mousePos = getMousePos(posingCanvas, e);
            this.state.currentMousePos = mousePos;

            if (this.state.isDraggingGround) {
                this.state.groundY = Math.max(0, Math.min(mousePos.y, this.layout.POSING_AREA_HEIGHT));
                this.redrawPosingCanvas();
                return;
            }
            if (this.state.isDraggingVerticalGuide) {
                this.state.verticalGuideX = Math.max(0, Math.min(mousePos.x, posingCanvas.width));
                this.redrawPosingCanvas();
                return;
            }

            if (this.state.draggedPointKey && this.state.activeKeyframeIndex !== null) {
                // Handle FK (Forward Kinematics) drag
                if (this.state.draggedPointKey === 'hip') {
                    this.state.stickFigurePose.hip = mousePos;
                } else {
                    const parentKey = hierarchy[this.state.draggedPointKey as keyof typeof hierarchy]!;
                    const currentPoints = calculatePointsFromPose(this.state.stickFigurePose, hierarchy, boneLengths, children);
                    const parentPos = currentPoints[parentKey as keyof StickFigurePoints];
                    const newAngle = Math.atan2(mousePos.y - parentPos.y, mousePos.x - parentPos.x);
                    this.state.stickFigurePose.angles[this.state.draggedPointKey] = newAngle;
                }
                this.updateUI(); // Redraw both canvases for live thumbnail update
            } else if (this.state.draggedEndEffector && this.state.activeKeyframeIndex !== null) {
                // Handle IK (Inverse Kinematics) drag
                const newPose = solveIKForEndEffector(
                    mousePos, 
                    this.state.draggedEndEffector, 
                    this.state.stickFigurePose, 
                    this.kinematics
                );
                if (newPose) {
                    this.state.stickFigurePose = newPose;
                }
                this.updateUI(); // Redraw both canvases for live thumbnail update
            } else {
                // Check for hovers only if not dragging anything
                const currentPoints = calculatePointsFromPose(this.state.stickFigurePose, hierarchy, boneLengths, children);
                this.state.hoveredJointKey = checkHoveringJoint(currentPoints, this.grabRadius, mousePos, this.state.isIKModeEnabled);
                const horizontalGrabberRect: Rect = { 
                    x: 0, 
                    y: this.state.groundY - this.GUIDE_GRAB_BUFFER, 
                    width: this.layout.GUIDE_GRABBER_SIZE, 
                    height: this.GUIDE_GRAB_BUFFER * 2 
                };
                this.state.hoveredGround = isInside(mousePos, horizontalGrabberRect) && mousePos.y < this.layout.POSING_AREA_HEIGHT;
                const verticalGrabberRect: Rect = { 
                    x: this.state.verticalGuideX - this.GUIDE_GRAB_BUFFER, 
                    y: this.layout.POSING_AREA_HEIGHT - this.layout.GUIDE_GRABBER_SIZE, 
                    width: this.GUIDE_GRAB_BUFFER * 2, 
                    height: this.layout.GUIDE_GRABBER_SIZE 
                };
                this.state.hoveredVerticalGuide = isInside(mousePos, verticalGrabberRect) && mousePos.y < this.layout.POSING_AREA_HEIGHT;
                this.redrawPosingCanvas();
            }
        });
    }

    private setupUICanvasMouseHandlers() {
        const { uiCanvas } = this.dom;

        // MOUSE DOWN
        uiCanvas.addEventListener('mousedown', (e) => {
            const mousePos = getMousePos(uiCanvas, e);

            // Scroll buttons should work even during animation
            if (isInside(mousePos, this.layout.SCROLL_LEFT_BUTTON_RECT)) {
                this.state.scrollOffset = Math.max(0, this.state.scrollOffset - 1);
                this.updateUI(); 
                return;
            }
            if (isInside(mousePos, this.layout.SCROLL_RIGHT_BUTTON_RECT)) {
                this.state.scrollOffset = Math.min(this.state.scrollOffset + 1, Math.max(0, this.state.keyframes.length - this.layout.VISIBLE_THUMBNAILS));
                this.updateUI(); 
                return;
            }

            if (this.state.isAnimating && !this.state.isPaused) return;

            if (this.state.hoveredPlayhead) {
                this.state.isDraggingPlayhead = true;
                this.state.activeKeyframeIndex = null; // Deselect keyframe while scrubbing
                this.updateUI();
                return;
            }

            if (this.state.hoveredMarkerIndex !== null) {
                if (this.state.activeKeyframeIndex !== this.state.hoveredMarkerIndex) {
                    autoSaveCurrentPoseIfActive(this.state);
                    this.state.activeKeyframeIndex = this.state.hoveredMarkerIndex;
                    this.state.stickFigurePose = JSON.parse(JSON.stringify(this.state.keyframes[this.state.hoveredMarkerIndex].pose));
                    this.state.animationProgress = this.state.keyframes[this.state.hoveredMarkerIndex].time;

                    if (this.state.activeKeyframeIndex < this.state.scrollOffset) {
                        this.state.scrollOffset = this.state.activeKeyframeIndex;
                    } else if (this.state.activeKeyframeIndex >= this.state.scrollOffset + this.layout.VISIBLE_THUMBNAILS) {
                        this.state.scrollOffset = this.state.activeKeyframeIndex - this.layout.VISIBLE_THUMBNAILS + 1;
                    }
                }
                if (this.state.hoveredMarkerIndex > 0 && this.state.hoveredMarkerIndex < this.state.keyframes.length - 1) {
                    this.state.draggedMarkerIndex = this.state.hoveredMarkerIndex;
                }
                this.updateUI();
                return;
            }

            if (this.state.hoveredDeleteIconIndex !== null) {
                this.deleteKeyframe(this.state.hoveredDeleteIconIndex);
                this.updateUI();
                return;
            }

            for (let i = 0; i < this.layout.THUMBNAIL_RECTS.length; i++) {
                const clickedIndex = this.state.scrollOffset + i;
                if (isInside(mousePos, this.layout.THUMBNAIL_RECTS[i]) && this.state.keyframes[clickedIndex]) {
                    if (this.state.activeKeyframeIndex !== clickedIndex) {
                        autoSaveCurrentPoseIfActive(this.state);
                        this.state.activeKeyframeIndex = clickedIndex;
                        this.state.stickFigurePose = JSON.parse(JSON.stringify(this.state.keyframes[clickedIndex].pose));
                        this.state.animationProgress = this.state.keyframes[clickedIndex].time;
                    }
                    this.state.draggedThumbnailIndex = clickedIndex;
                    this.state.dropTargetIndex = clickedIndex;
                    this.updateUI();
                    return;
                }
            }
        });

        // MOUSE MOVE
        uiCanvas.addEventListener('mousemove', (e) => {
            if (this.state.isAnimating && !this.state.isPaused) return;
            const mousePos = getMousePos(uiCanvas, e);
            this.state.currentMousePos = mousePos;
            let needsRedraw = false;

            if (this.state.isDraggingPlayhead && this.state.keyframes.length > 0) {
                const progress = (mousePos.x - this.layout.TIMELINE_RECT.x) / this.layout.TIMELINE_RECT.width;
                this.state.animationProgress = Math.max(0, Math.min(1, progress));
                updatePoseForAnimationProgress(this.state);
                // We need a full UI update to redraw the posing canvas
                this.updateUI();
                return; // Exit early since we've done a full redraw
            } else if (this.state.draggedMarkerIndex !== null) {
                const progress = (mousePos.x - this.layout.TIMELINE_RECT.x) / this.layout.TIMELINE_RECT.width;
                const newTime = Math.max(0, Math.min(1, progress));
                
                // Find the closest keyframes before and after the dragged marker
                const draggedKeyframe = this.state.keyframes[this.state.draggedMarkerIndex];
                let prevKeyframe: Keyframe | null = null;
                let nextKeyframe: Keyframe | null = null;
                
                for (let i = 0; i < this.state.keyframes.length; i++) {
                    if (i === this.state.draggedMarkerIndex) continue;
                    
                    const keyframeTime = this.state.keyframes[i].time as number;
                    const draggedTime = draggedKeyframe.time as number;
                    
                    if (keyframeTime < draggedTime) {
                        if (!prevKeyframe || keyframeTime > (prevKeyframe.time as number)) {
                            prevKeyframe = this.state.keyframes[i];
                        }
                    } else {
                        if (!nextKeyframe || keyframeTime < (nextKeyframe.time as number)) {
                            nextKeyframe = this.state.keyframes[i];
                        }
                    }
                }
                
                // Constrain the new time to prevent overlapping
                let constrainedTime = newTime;
                if (prevKeyframe) {
                    constrainedTime = Math.max(constrainedTime, (prevKeyframe.time as number) + 0.01); // Small buffer
                }
                if (nextKeyframe) {
                    constrainedTime = Math.min(constrainedTime, (nextKeyframe.time as number) - 0.01); // Small buffer
                }
                
                this.state.keyframes[this.state.draggedMarkerIndex].time = constrainedTime;
                needsRedraw = true;
            } else if (this.state.draggedThumbnailIndex !== null) {
                // Find which thumbnail the user is hovering over to determine drop target
                let newDropIndex = null;
                for(let i = 0; i < this.layout.THUMBNAIL_RECTS.length; i++) {
                    const rect = this.layout.THUMBNAIL_RECTS[i];
                    const actualIndex = this.state.scrollOffset + i;
                    if (mousePos.x < rect.x + rect.width / 2) {
                         newDropIndex = actualIndex;
                         break;
                    }
                }
                if (newDropIndex === null && this.layout.THUMBNAIL_RECTS.length > 0) {
                     newDropIndex = this.state.scrollOffset + this.layout.THUMBNAIL_RECTS.length;
                }
                // Ensure drop target is within valid bounds
                if (newDropIndex !== null && newDropIndex >= this.state.keyframes.length) {
                    newDropIndex = this.state.keyframes.length - 1;
                }
                if(this.state.dropTargetIndex !== newDropIndex) {
                    this.state.dropTargetIndex = newDropIndex;
                    needsRedraw = true;
                }
                this.updateUI();
            } else {
                const prevHoveredPlayhead = this.state.hoveredPlayhead;
                const playheadRect: Rect = { 
                    x: this.layout.TIMELINE_RECT.x + this.state.animationProgress * this.layout.TIMELINE_RECT.width - 5, 
                    y: this.layout.TIMELINE_RECT.y, 
                    width: 10, 
                    height: this.layout.TIMELINE_RECT.height 
                };
                this.state.hoveredPlayhead = isInside(mousePos, playheadRect);
                if(prevHoveredPlayhead !== this.state.hoveredPlayhead) needsRedraw = true;

                const prevHoveredMarker = this.state.hoveredMarkerIndex;
                let newHoveredMarker = null;
                for (let i = 0; i < this.state.keyframes.length; i++) {
                    const markerRect = getTimelineMarkerRect(this.state.keyframes[i], this.layout.TIMELINE_RECT);
                    if (isInside(mousePos, markerRect)) {
                        newHoveredMarker = i;
                        break;
                    }
                }
                this.state.hoveredMarkerIndex = newHoveredMarker;
                if(prevHoveredMarker !== this.state.hoveredMarkerIndex) needsRedraw = true;

                const prevHoveredThumbnail = this.state.hoveredThumbnailIndex;
                let newHoveredThumbnail = null;
                for (let i = 0; i < this.layout.THUMBNAIL_RECTS.length; i++) {
                    if (isInside(mousePos, this.layout.THUMBNAIL_RECTS[i])) {
                        const actualIndex = this.state.scrollOffset + i;
                        if (this.state.keyframes[actualIndex]) {
                            newHoveredThumbnail = actualIndex;
                            break;
                        }
                    }
                }
                this.state.hoveredThumbnailIndex = newHoveredThumbnail;
                if(prevHoveredThumbnail !== this.state.hoveredThumbnailIndex) needsRedraw = true;

                const prevHoveredDeleteIcon = this.state.hoveredDeleteIconIndex;
                let newHoveredDeleteIcon = null;
                for (let i = 0; i < this.layout.THUMBNAIL_RECTS.length; i++) {
                    const actualIndex = this.state.scrollOffset + i;
                    if (this.state.keyframes[actualIndex]) {
                        const deleteRect = this.getDeleteButtonRect(this.layout.THUMBNAIL_RECTS[i]);
                        if (isInside(mousePos, deleteRect)) {
                            newHoveredDeleteIcon = actualIndex;
                            break;
                        }
                    }
                }
                this.state.hoveredDeleteIconIndex = newHoveredDeleteIcon;
                if(prevHoveredDeleteIcon !== this.state.hoveredDeleteIconIndex) needsRedraw = true;

                const prevHoveredScrollLeft = this.state.hoveredScrollLeft;
                this.state.hoveredScrollLeft = isInside(mousePos, this.layout.SCROLL_LEFT_BUTTON_RECT);
                if(prevHoveredScrollLeft !== this.state.hoveredScrollLeft) needsRedraw = true;

                const prevHoveredScrollRight = this.state.hoveredScrollRight;
                this.state.hoveredScrollRight = isInside(mousePos, this.layout.SCROLL_RIGHT_BUTTON_RECT);
                if(prevHoveredScrollRight !== this.state.hoveredScrollRight) needsRedraw = true;
            }

            if (needsRedraw) {
                this.redrawUICanvas();
            }
        });
    }

    private setupGlobalMouseHandlers() {
        const handleMouseUp = () => {
            if (this.state.draggedPointKey) {
                autoSaveCurrentPoseIfActive(this.state);
            }
            this.state.isDraggingGround = false;
            this.state.isDraggingVerticalGuide = false;
            this.state.draggedPointKey = null;
            this.state.draggedEndEffector = null;
            this.state.isDraggingPlayhead = false;
            
            if (this.state.draggedMarkerIndex !== null) {
                // The time has already been updated in the mousemove handler.
                // We just need to finalize the state and redraw.
                this.state.draggedMarkerIndex = null;
                this.updateUI();
            }

            if (this.state.draggedThumbnailIndex !== null) {
                if (this.state.dropTargetIndex !== null && this.state.dropTargetIndex !== this.state.draggedThumbnailIndex) {
                     const draggedItem = this.state.keyframes.splice(this.state.draggedThumbnailIndex, 1)[0];
                     const targetIndex = (this.state.dropTargetIndex > this.state.draggedThumbnailIndex) ? this.state.dropTargetIndex - 1 : this.state.dropTargetIndex;
                     const targetItem = this.state.keyframes[targetIndex];
                     // Swap times
                     const tempTime = draggedItem.time;
                     draggedItem.time = targetItem.time;
                     targetItem.time = tempTime;
                     this.state.keyframes.splice(targetIndex, 0, draggedItem);
                     
                     // Ensure the keyframe with the highest time is at the end and has time = 1.0
                     this.state.keyframes.sort((a, b) => a.time - b.time);
                     const lastKeyframe = this.state.keyframes[this.state.keyframes.length - 1];
                     if (lastKeyframe.time !== 1.0) {
                         // Adjust the animation duration to maintain the relative timing
                         const oldDuration = this.state.animationTotalDuration;
                         const newDuration = oldDuration * lastKeyframe.time;
                         this.state.animationTotalDuration = newDuration;
                         
                         // Renormalize all keyframes to fit the new duration
                         for (const kf of this.state.keyframes) {
                             kf.time = kf.time / lastKeyframe.time;
                         }
                         lastKeyframe.time = 1.0;
                     }
                     
                     this.state.activeKeyframeIndex = this.state.keyframes.indexOf(draggedItem);
                }
                this.state.draggedThumbnailIndex = null;
                this.state.dropTargetIndex = null;
                this.updateUI();
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
    }

    private addKeyframe() {
        addKeyframe(this.state, this.layout);
    }

    private deleteKeyframe(index: number) {
        deleteKeyframe(this.state, index, this.kinematics.defaultPose, this.layout);
    }

    private getDeleteButtonRect(thumbnailRect: Rect): Rect {
        const size = 18;
        const padding = 3;
        return {
            x: thumbnailRect.x + thumbnailRect.width - size - padding,
            y: thumbnailRect.y + padding,
            width: size,
            height: size,
        };
    }

    private setupKeyboardHandlers() {
        window.addEventListener('keydown', (e) => {
            if (this.state.isAnimating || (document.activeElement && document.activeElement.tagName === 'INPUT') || this.state.isDraggingGround || this.state.isDraggingVerticalGuide || this.state.draggedMarkerIndex !== null) {
                return;
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (this.state.keyframes.length === 0) return;

                let nextIndex: number;
                if (this.state.activeKeyframeIndex === null) {
                    nextIndex = (e.key === 'ArrowLeft') ? this.state.keyframes.length - 1 : 0;
                } else {
                    nextIndex = (e.key === 'ArrowLeft') ? this.state.activeKeyframeIndex - 1 : this.state.activeKeyframeIndex + 1;
                }
                
                if (nextIndex >= 0 && nextIndex < this.state.keyframes.length) {
                    autoSaveCurrentPoseIfActive(this.state);

                    this.state.activeKeyframeIndex = nextIndex;
                    this.state.stickFigurePose = JSON.parse(JSON.stringify(this.state.keyframes[this.state.activeKeyframeIndex].pose));
                    this.state.animationProgress = this.state.keyframes[this.state.activeKeyframeIndex].time;

                    if (this.state.activeKeyframeIndex < this.state.scrollOffset) {
                        this.state.scrollOffset = this.state.activeKeyframeIndex;
                    } else if (this.state.activeKeyframeIndex >= this.state.scrollOffset + this.layout.VISIBLE_THUMBNAILS) {
                        this.state.scrollOffset = this.state.activeKeyframeIndex - this.layout.VISIBLE_THUMBNAILS + 1;
                    }
                    this.updateUI();
                }
            }
        });
    }
} 