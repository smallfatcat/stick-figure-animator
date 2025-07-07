import { AppState } from './state';
import { DOMElements } from './dom';
import { Layout, getDeleteButtonRect, getTimelineMarkerRect } from './ui';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { startAnimation, stopAnimation, pauseAnimation, resumeAnimation } from './animationLoop';
import { autoSaveCurrentPoseIfActive, addKeyframe, deleteKeyframe, insertKeyframeAtTime, redistributeKeyframeTimes } from './keyframeManager';
import { getMousePos, isInside, exportKeyframesAsJSON, loadKeyframesFromFile } from './utils';
import { Rect, StickFigurePoints, Keyframe } from './types';
import { updatePoseForAnimationProgress } from './animation';

type RedrawFunction = () => void;

export function setupEventHandlers(
    dom: DOMElements, 
    state: AppState, 
    layout: Layout, 
    kinematics: KinematicsData,
    redraw: RedrawFunction
) {
    const { canvas, animateBtn, pauseBtn, modeBtn, onionBtn, exportBtn, importBtn, importInput, durationInput, onionBeforeInput, onionAfterInput, insertKeyframeBtn } = dom;
    const { defaultPose, hierarchy, boneLengths, children } = kinematics;
    const grabRadius = 15;
    const GUIDE_GRAB_BUFFER = 10;

    animateBtn.addEventListener('click', () => {
        if (state.isAnimating) {
            stopAnimation(state, redraw);
        } else if (state.keyframes.length >= 2) {
            autoSaveCurrentPoseIfActive(state);
            startAnimation(state, redraw);
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (!state.isAnimating) return;
        if (state.isPaused) {
            resumeAnimation(state, redraw);
        } else {
            pauseAnimation(state, redraw);
        }
    });

    insertKeyframeBtn.addEventListener('click', () => {
        if (insertKeyframeBtn.disabled) return;

        // The current state.stickFigurePose is the interpolated one we want to save.
        // insertKeyframeAtTime creates a deep copy of the pose.
        const newIndex = insertKeyframeAtTime(state, state.stickFigurePose, state.animationProgress);

        // Manually stop the animation state machine without resetting the main pose or active index.
        if (state.animationRequestId) {
            cancelAnimationFrame(state.animationRequestId);
        }
        state.animationRequestId = null;
        state.isAnimating = false;
        state.isPaused = false;
        
        // Set the new keyframe as the active one. The stickFigurePose is already correct.
        state.activeKeyframeIndex = newIndex;

        // Ensure thumbnail is visible in the scrollable timeline.
        if (state.activeKeyframeIndex < state.scrollOffset) {
            state.scrollOffset = state.activeKeyframeIndex;
        } else if (state.activeKeyframeIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
            state.scrollOffset = state.activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
        }

        redraw();
    });

    modeBtn.addEventListener('click', () => {
        if (state.isAnimating || state.keyframes.length < 2) return;
        state.animationMode = state.animationMode === 'loop' ? 'ping-pong' : 'loop';
        redraw();
    });

    onionBtn.addEventListener('click', () => {
        if (state.isAnimating || state.activeKeyframeIndex === null) return;
        state.isOnionModeEnabled = !state.isOnionModeEnabled;
        redraw();
    });

    onionBeforeInput.addEventListener('change', () => {
        const value = parseInt(onionBeforeInput.value, 10);
        if (!isNaN(value) && value >= 0) {
            state.onionSkinBefore = value;
            if (state.isOnionModeEnabled) redraw();
        } else {
            onionBeforeInput.value = state.onionSkinBefore.toString();
        }
    });

    onionAfterInput.addEventListener('change', () => {
        const value = parseInt(onionAfterInput.value, 10);
        if (!isNaN(value) && value >= 0) {
            state.onionSkinAfter = value;
            if (state.isOnionModeEnabled) redraw();
        } else {
            onionAfterInput.value = state.onionSkinAfter.toString();
        }
    });

    exportBtn.addEventListener('click', () => {
        if (state.isAnimating || state.keyframes.length === 0) return;
        autoSaveCurrentPoseIfActive(state);
        exportKeyframesAsJSON(state.keyframes);
    });

    importBtn.addEventListener('click', () => {
        if (state.isAnimating) return;
        importInput.click();
    });

    importInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            try {
                autoSaveCurrentPoseIfActive(state);
                const loadedKfs = await loadKeyframesFromFile(file);
                state.keyframes = loadedKfs;
                state.scrollOffset = 0;
                
                if (state.keyframes.length > 0) {
                    state.activeKeyframeIndex = 0;
                    state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[0].pose));
                    state.animationProgress = state.keyframes[0].time;
                } else {
                    state.activeKeyframeIndex = null;
                    state.stickFigurePose = JSON.parse(JSON.stringify(defaultPose));
                    state.animationProgress = 0;
                }
                
                state.isOnionModeEnabled = false;
                redraw();
            } catch (error) {
                alert("Failed to load keyframes. Please check the file format.");
            }
        }
        (e.target as HTMLInputElement).value = '';
    });

    durationInput.addEventListener('change', () => {
        const newDuration = parseFloat(durationInput.value);
        if (!isNaN(newDuration) && newDuration > 0) {
            state.animationTotalDuration = newDuration * 1000;
        } else {
            durationInput.value = (state.animationTotalDuration / 1000).toString();
            alert("Invalid duration. Please enter a positive number.");
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const mousePos = getMousePos(canvas, e);
        if (state.isAnimating && !state.isPaused) return;

        if (state.hoveredPlayhead) {
            state.isDraggingPlayhead = true;
            state.activeKeyframeIndex = null; // Deselect keyframe while scrubbing
            redraw();
            return;
        }

        if (state.hoveredMarkerIndex !== null) {
            if (state.activeKeyframeIndex !== state.hoveredMarkerIndex) {
                autoSaveCurrentPoseIfActive(state);
                state.activeKeyframeIndex = state.hoveredMarkerIndex;
                state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.hoveredMarkerIndex].pose));
                state.animationProgress = state.keyframes[state.hoveredMarkerIndex].time;

                if (state.activeKeyframeIndex < state.scrollOffset) {
                    state.scrollOffset = state.activeKeyframeIndex;
                } else if (state.activeKeyframeIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
                    state.scrollOffset = state.activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
                }
            }
            if (state.hoveredMarkerIndex > 0 && state.hoveredMarkerIndex < state.keyframes.length - 1) {
                state.draggedMarkerIndex = state.hoveredMarkerIndex;
            }
            redraw();
            return;
        }

        const horizontalGrabberRect: Rect = { x: 0, y: state.groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
        if (isInside(mousePos, horizontalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT) {
            state.isDraggingGround = true;
            return;
        }
        const verticalGrabberRect: Rect = { x: state.verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };
        if (isInside(mousePos, verticalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT) {
            state.isDraggingVerticalGuide = true;
            return;
        }

        if (state.hoveredDeleteIconIndex !== null) {
            deleteKeyframe(state, state.hoveredDeleteIconIndex, defaultPose, layout);
            redraw();
            return;
        }

        if (isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT)) {
            state.scrollOffset = Math.max(0, state.scrollOffset - 1);
            redraw(); return;
        }
        if (isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT)) {
            state.scrollOffset = Math.min(state.scrollOffset + 1, Math.max(0, state.keyframes.length - layout.VISIBLE_THUMBNAILS));
            redraw(); return;
        }

        for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
            const clickedIndex = state.scrollOffset + i;
            if (isInside(mousePos, layout.THUMBNAIL_RECTS[i]) && state.keyframes[clickedIndex]) {
                if (state.activeKeyframeIndex !== clickedIndex) {
                     autoSaveCurrentPoseIfActive(state);
                     state.activeKeyframeIndex = clickedIndex;
                     state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[clickedIndex].pose));
                     state.animationProgress = state.keyframes[clickedIndex].time;
                }
                // Start dragging the thumbnail
                state.draggedThumbnailIndex = clickedIndex;
                redraw();
                return;
            }
        }
        
        const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
        let closestPoint: keyof StickFigurePoints | null = null;
        let minDistance = Infinity;
        for (const key in currentPoints) {
            const pointKey = key as keyof StickFigurePoints;
            const distance = Math.hypot(mousePos.x - currentPoints[pointKey].x, mousePos.y - currentPoints[pointKey].y);
            if (distance < grabRadius && distance < minDistance) {
                minDistance = distance;
                closestPoint = pointKey;
            }
        }
        state.draggedPointKey = closestPoint;

        if (!state.draggedPointKey && mousePos.y < layout.POSING_AREA_HEIGHT) {
            addKeyframe(state, layout);
            redraw();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const mousePos = getMousePos(canvas, e);
        state.currentMousePos = mousePos;

        if (state.draggedThumbnailIndex !== null) {
            state.dropTargetIndex = null; // Default to no target
            for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
                const rect = layout.THUMBNAIL_RECTS[i];
                const actualIndex = state.scrollOffset + i;

                if (actualIndex >= state.keyframes.length) continue;
                
                if (isInside(mousePos, rect)) {
                    if (actualIndex === state.draggedThumbnailIndex) {
                        state.dropTargetIndex = null;
                    } else {
                        const midX = rect.x + rect.width / 2;
                        state.dropTargetIndex = (mousePos.x < midX) ? actualIndex : actualIndex + 1;
                    }
                    break;
                }
            }
            redraw();
            return;
        }

        if (state.isDraggingPlayhead) {
            const timelineRect = layout.TIMELINE_RECT;
            let newProgress = (mousePos.x - timelineRect.x) / timelineRect.width;
            newProgress = Math.max(0, Math.min(1, newProgress));

            state.animationProgress = newProgress;
            // Update elapsed time so resume works from the new spot
            state.timeElapsedBeforePause = state.animationProgress * state.animationTotalDuration;
            
            updatePoseForAnimationProgress(state);
            redraw();
            return;
        }

        if (state.draggedMarkerIndex !== null) {
            const timelineRect = layout.TIMELINE_RECT;
            let newTime = (mousePos.x - timelineRect.x) / timelineRect.width;

            const prevTime = state.keyframes[state.draggedMarkerIndex - 1].time;
            const nextTime = state.keyframes[state.draggedMarkerIndex + 1].time;
            
            newTime = Math.max(prevTime, Math.min(newTime, nextTime));
            
            state.keyframes[state.draggedMarkerIndex].time = newTime;
            redraw();
            return;
        }

        if (state.isDraggingGround) {
            state.groundY = Math.max(0, Math.min(mousePos.y, layout.POSING_AREA_HEIGHT));
            redraw();
            return;
        }
        if (state.isDraggingVerticalGuide) {
            state.verticalGuideX = Math.max(0, Math.min(mousePos.x, canvas.width));
            redraw();
            return;
        }
        
        // Reset hover states
        state.hoveredScrollLeft = false;
        state.hoveredScrollRight = false;
        state.hoveredThumbnailIndex = null;
        state.hoveredDeleteIconIndex = null;
        state.hoveredMarkerIndex = null;
        state.hoveredGround = false;
        state.hoveredVerticalGuide = false;
        state.hoveredPlayhead = false;

        if (!state.isAnimating || state.isPaused) {
            if (state.keyframes.length > 0) {
                const playheadX = layout.TIMELINE_RECT.x + state.animationProgress * layout.TIMELINE_RECT.width;
                // Increase grab area a bit for easier interaction
                const playheadGrabArea = { x: playheadX - 6, y: layout.TIMELINE_RECT.y - 6, width: 12, height: layout.TIMELINE_RECT.height + 12 };
                if (isInside(mousePos, playheadGrabArea)) {
                    state.hoveredPlayhead = true;
                }
            }

            state.hoveredScrollLeft = isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT);
            state.hoveredScrollRight = isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT);

            for(let i=0; i < state.keyframes.length; i++) {
                const markerRect = getTimelineMarkerRect(state.keyframes[i], layout.TIMELINE_RECT);
                if (isInside(mousePos, markerRect)) {
                    state.hoveredMarkerIndex = i;
                    break;
                }
            }

            if (mousePos.y < layout.POSING_AREA_HEIGHT) {
                const horizontalGrabberRect: Rect = { x: 0, y: state.groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
                const verticalGrabberRect: Rect = { x: state.verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };

                if (isInside(mousePos, horizontalGrabberRect)) state.hoveredGround = true;
                else if (isInside(mousePos, verticalGrabberRect)) state.hoveredVerticalGuide = true;
            }

            for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
                const thumbRect = layout.THUMBNAIL_RECTS[i];
                const actualIndex = state.scrollOffset + i;
                if (state.keyframes[actualIndex] && isInside(mousePos, thumbRect)) {
                    state.hoveredThumbnailIndex = actualIndex; 

                    const deleteRect = getDeleteButtonRect(thumbRect);
                    if (isInside(mousePos, deleteRect)) {
                        state.hoveredDeleteIconIndex = actualIndex;
                        state.hoveredThumbnailIndex = null; // Prioritize delete hover
                        break; 
                    }
                }
            }
        }

        if (state.draggedPointKey) {
            mousePos.y = Math.min(mousePos.y, layout.POSING_AREA_HEIGHT - 2);

            if (state.draggedPointKey === 'hip') {
                state.stickFigurePose.hip = mousePos;
            } else {
                const parentKey = hierarchy[state.draggedPointKey as keyof typeof hierarchy]!;
                const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
                const parentPos = currentPoints[parentKey as keyof StickFigurePoints];
                
                const newAngle = Math.atan2(mousePos.y - parentPos.y, mousePos.x - parentPos.x);
                state.stickFigurePose.angles[state.draggedPointKey] = newAngle;
            }
        }
        redraw();
    });

    canvas.addEventListener('mouseup', () => { 
        // Handle thumbnail drop
        if (state.draggedThumbnailIndex !== null && state.dropTargetIndex !== null) {
            const sourceIndex = state.draggedThumbnailIndex;
            let insertIndex = state.dropTargetIndex;

            const [draggedKeyframe] = state.keyframes.splice(sourceIndex, 1);

            // Adjust index because we removed an element
            if (sourceIndex < insertIndex) {
                insertIndex--;
            }

            state.keyframes.splice(insertIndex, 0, draggedKeyframe);

            // Update state to reflect the reorder
            state.activeKeyframeIndex = insertIndex;
            redistributeKeyframeTimes(state.keyframes);
            if (state.keyframes[insertIndex]) {
                 state.animationProgress = state.keyframes[insertIndex].time;
            }
        }

        // Reset all drag states
        state.draggedPointKey = null;
        state.isDraggingGround = false;
        state.isDraggingVerticalGuide = false;
        state.draggedMarkerIndex = null;
        state.isDraggingPlayhead = false;
        state.draggedThumbnailIndex = null;
        state.dropTargetIndex = null;
        redraw();
    });

    canvas.addEventListener('mouseleave', () => {
        // Reset all drag states
        state.draggedPointKey = null;
        state.isDraggingGround = false;
        state.isDraggingVerticalGuide = false;
        state.draggedMarkerIndex = null;
        state.isDraggingPlayhead = false;
        state.draggedThumbnailIndex = null;
        state.dropTargetIndex = null;
        state.currentMousePos = null;

        if(!state.isAnimating || state.isPaused){
            state.hoveredScrollLeft = false;
            state.hoveredScrollRight = false;
            state.hoveredThumbnailIndex = null;
            state.hoveredDeleteIconIndex = null;
            state.hoveredGround = false;
            state.hoveredVerticalGuide = false;
            state.hoveredMarkerIndex = null;
            state.hoveredPlayhead = false;
        }
        redraw();
    });

    window.addEventListener('keydown', (e) => {
        if (state.isAnimating || (document.activeElement && document.activeElement.tagName === 'INPUT') || state.isDraggingGround || state.isDraggingVerticalGuide || state.draggedMarkerIndex !== null) {
            return;
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (state.keyframes.length === 0) return;

            let nextIndex: number;
            if (state.activeKeyframeIndex === null) {
                nextIndex = (e.key === 'ArrowLeft') ? state.keyframes.length - 1 : 0;
            } else {
                nextIndex = (e.key === 'ArrowLeft') ? state.activeKeyframeIndex - 1 : state.activeKeyframeIndex + 1;
            }
            
            if (nextIndex >= 0 && nextIndex < state.keyframes.length) {
                autoSaveCurrentPoseIfActive(state);

                state.activeKeyframeIndex = nextIndex;
                state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.activeKeyframeIndex].pose));
                state.animationProgress = state.keyframes[state.activeKeyframeIndex].time;

                if (state.activeKeyframeIndex < state.scrollOffset) {
                    state.scrollOffset = state.activeKeyframeIndex;
                } else if (state.activeKeyframeIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
                    state.scrollOffset = state.activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
                }
                redraw();
            }
        }
    });
}