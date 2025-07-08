import { AppState } from './state';
import { DOMElements } from './dom';
import { Layout, getDeleteButtonRect, getTimelineMarkerRect } from './ui';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { startAnimation, stopAnimation, pauseAnimation, resumeAnimation } from './animationLoop';
import { autoSaveCurrentPoseIfActive, addKeyframe, deleteKeyframe, insertKeyframeAtTime, redistributeKeyframeTimes } from './keyframeManager';
import { getMousePos, isInside, exportKeyframesAsJSON, loadKeyframesFromFile } from './utils';
import { Rect, StickFigurePoints, RedrawFunction } from './types';
import { updatePoseForAnimationProgress } from './animation';
import { solveIKForEndEffector, isEndEffector } from './inverseKinematics';
import { checkHoveringJoint } from './drawing';

export function setupEventHandlers(
    dom: DOMElements, 
    state: AppState, 
    layout: Layout, 
    kinematics: KinematicsData,
    updateUI: RedrawFunction,
    redrawPosingCanvas: RedrawFunction,
    redrawUICanvas: RedrawFunction
) {
    const { posingCanvas, uiCanvas, animateBtn, pauseBtn, modeBtn, ikModeBtn, onionBtn, exportBtn, importBtn, importInput, durationInput, onionBeforeInput, onionAfterInput, insertKeyframeBtn, timeModeToggleBtn, fullOnionSkinBtn, motionTrailStepInput } = dom;
    const { defaultPose, hierarchy, boneLengths, children } = kinematics;
    const grabRadius = 15;
    const GUIDE_GRAB_BUFFER = 10;

    animateBtn.addEventListener('click', () => {
        if (state.isAnimating) {
            stopAnimation(state, updateUI);
        } else if (state.keyframes.length >= 2) {
            autoSaveCurrentPoseIfActive(state);
            startAnimation(state, updateUI, redrawPosingCanvas, redrawUICanvas, kinematics, layout, posingCanvas);
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (!state.isAnimating) return;
        if (state.isPaused) {
            resumeAnimation(state, updateUI, redrawPosingCanvas, redrawUICanvas);
        } else {
            pauseAnimation(state, updateUI);
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

        updateUI();
    });

    modeBtn.addEventListener('click', () => {
        if (state.keyframes.length < 2) return;
        state.animationMode = state.animationMode === 'loop' ? 'ping-pong' : 'loop';
        updateUI();
    });

    ikModeBtn.addEventListener('click', () => {
        if (state.isAnimating) return;
        state.isIKModeEnabled = !state.isIKModeEnabled;
        state.draggedEndEffector = null; // Reset any active IK dragging
        updateUI();
    });

    onionBtn.addEventListener('click', () => {
        if (state.isAnimating || state.activeKeyframeIndex === null) return;
        state.isOnionModeEnabled = !state.isOnionModeEnabled;
        updateUI();
    });

    fullOnionSkinBtn.addEventListener('click', () => {
        if (fullOnionSkinBtn.disabled) return;
        state.isFullOnionSkinEnabled = !state.isFullOnionSkinEnabled;
        updateUI();
    });

    motionTrailStepInput.addEventListener('change', () => {
        const value = parseInt(motionTrailStepInput.value, 10);
        if (!isNaN(value) && value >= 1) {
            state.motionTrailResolution = value;
        } else {
            motionTrailStepInput.value = state.motionTrailResolution.toString();
        }
    });

    onionBeforeInput.addEventListener('change', () => {
        const value = parseInt(onionBeforeInput.value, 10);
        if (!isNaN(value) && value >= 0) {
            state.onionSkinBefore = value;
            if (state.isOnionModeEnabled) updateUI();
        } else {
            onionBeforeInput.value = state.onionSkinBefore.toString();
        }
    });

    onionAfterInput.addEventListener('change', () => {
        const value = parseInt(onionAfterInput.value, 10);
        if (!isNaN(value) && value >= 0) {
            state.onionSkinAfter = value;
            if (state.isOnionModeEnabled) updateUI();
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
                updateUI();
            } catch (error) {
                alert("Failed to load keyframes. Please check the file format.");
            }
        }
        (e.target as HTMLInputElement).value = '';
    });

    timeModeToggleBtn.addEventListener('click', () => {
        if (state.isAnimating) return;
        state.timeDisplayMode = state.timeDisplayMode === 'seconds' ? 'frames' : 'seconds';
        updateUI();
    });

    durationInput.addEventListener('change', () => {
        if (state.timeDisplayMode === 'seconds') {
            const value = parseFloat(durationInput.value);
            if (!isNaN(value) && value > 0) {
                state.animationTotalDuration = value * 1000;
            } else {
                alert("Invalid duration. Please enter a positive number.");
            }
        } else { // frames
            const frameValue = parseInt(durationInput.value, 10);
             if (!isNaN(frameValue) && frameValue > 0) {
                state.animationTotalDuration = (frameValue / 60) * 1000;
            } else {
                alert("Invalid duration. Please enter a positive integer for frames.");
            }
        }
        updateUI();
    });

    // MOUSE DOWN
    posingCanvas.addEventListener('mousedown', (e) => {
        const mousePos = getMousePos(posingCanvas, e);
        if (state.isAnimating && !state.isPaused) return;

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

        const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
        const clickedJoint = checkHoveringJoint(currentPoints, grabRadius, mousePos, state.isIKModeEnabled);

        if (clickedJoint) {
            // A joint was clicked. If no keyframe is active, create one.
            if (state.activeKeyframeIndex === null) {
                addKeyframe(state, layout);
                updateUI();
            }
            // Set the appropriate drag state.
            if (state.isIKModeEnabled && isEndEffector(clickedJoint)) {
                state.draggedEndEffector = clickedJoint;
            } else {
                state.draggedPointKey = clickedJoint;
            }
        } else if (mousePos.y < layout.POSING_AREA_HEIGHT) {
            // An empty area was clicked, create a new keyframe.
            addKeyframe(state, layout);
            updateUI();
        }
    });

    uiCanvas.addEventListener('mousedown', (e) => {
        const mousePos = getMousePos(uiCanvas, e);
        if (state.isAnimating && !state.isPaused) return;

        if (state.hoveredPlayhead) {
            state.isDraggingPlayhead = true;
            state.activeKeyframeIndex = null; // Deselect keyframe while scrubbing
            updateUI();
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
            updateUI();
            return;
        }

        if (state.hoveredDeleteIconIndex !== null) {
            deleteKeyframe(state, state.hoveredDeleteIconIndex, defaultPose, layout);
            updateUI();
            return;
        }

        if (isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT)) {
            state.scrollOffset = Math.max(0, state.scrollOffset - 1);
            updateUI(); return;
        }
        if (isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT)) {
            state.scrollOffset = Math.min(state.scrollOffset + 1, Math.max(0, state.keyframes.length - layout.VISIBLE_THUMBNAILS));
            updateUI(); return;
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
                state.draggedThumbnailIndex = clickedIndex;
                state.dropTargetIndex = clickedIndex;
                updateUI();
                return;
            }
        }
    });

    // MOUSE MOVE
    posingCanvas.addEventListener('mousemove', (e) => {
        const mousePos = getMousePos(posingCanvas, e);
        state.currentMousePos = mousePos;

        if (state.isDraggingGround) {
            state.groundY = Math.max(0, Math.min(mousePos.y, layout.POSING_AREA_HEIGHT));
            redrawPosingCanvas();
            return;
        }
        if (state.isDraggingVerticalGuide) {
            state.verticalGuideX = Math.max(0, Math.min(mousePos.x, posingCanvas.width));
            redrawPosingCanvas();
            return;
        }

        if (state.draggedPointKey && state.activeKeyframeIndex !== null) {
            // Handle FK (Forward Kinematics) drag
            if (state.draggedPointKey === 'hip') {
                state.stickFigurePose.hip = mousePos;
            } else {
                const parentKey = hierarchy[state.draggedPointKey as keyof typeof hierarchy]!;
                const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
                const parentPos = currentPoints[parentKey as keyof StickFigurePoints];
                const newAngle = Math.atan2(mousePos.y - parentPos.y, mousePos.x - parentPos.x);
                state.stickFigurePose.angles[state.draggedPointKey] = newAngle;
            }
            updateUI(); // Redraw both canvases for live thumbnail update
        } else if (state.draggedEndEffector && state.activeKeyframeIndex !== null) {
            // Handle IK (Inverse Kinematics) drag
            const newPose = solveIKForEndEffector(
                mousePos, 
                state.draggedEndEffector, 
                state.stickFigurePose, 
                kinematics
            );
            if (newPose) {
                state.stickFigurePose = newPose;
            }
            updateUI(); // Redraw both canvases for live thumbnail update
        } else {
            // Check for hovers only if not dragging anything
            const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
            state.hoveredJointKey = checkHoveringJoint(currentPoints, grabRadius, mousePos, state.isIKModeEnabled);
            const horizontalGrabberRect: Rect = { x: 0, y: state.groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
            state.hoveredGround = isInside(mousePos, horizontalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT;
            const verticalGrabberRect: Rect = { x: state.verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };
            state.hoveredVerticalGuide = isInside(mousePos, verticalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT;
            redrawPosingCanvas();
        }
    });

    uiCanvas.addEventListener('mousemove', (e) => {
        if (state.isAnimating && !state.isPaused) return;
        const mousePos = getMousePos(uiCanvas, e);
        state.currentMousePos = mousePos; //
        let needsRedraw = false;

        if (state.isDraggingPlayhead && state.keyframes.length > 0) {
            const progress = (mousePos.x - layout.TIMELINE_RECT.x) / layout.TIMELINE_RECT.width;
            state.animationProgress = Math.max(0, Math.min(1, progress));
            updatePoseForAnimationProgress(state);
            // We need a full UI update to redraw the posing canvas
            updateUI();
            return; // Exit early since we've done a full redraw
        } else if (state.draggedMarkerIndex !== null) {
            const progress = (mousePos.x - layout.TIMELINE_RECT.x) / layout.TIMELINE_RECT.width;
            state.keyframes[state.draggedMarkerIndex].time = Math.max(0, Math.min(1, progress));
            needsRedraw = true;
        } else if (state.draggedThumbnailIndex !== null) {
             // Find which thumbnail the user is hovering over to determine drop target
            let newDropIndex = null;
            for(let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
                const rect = layout.THUMBNAIL_RECTS[i];
                const actualIndex = state.scrollOffset + i;
                if (mousePos.x < rect.x + rect.width / 2) {
                     newDropIndex = actualIndex;
                     break;
                }
            }
            if (newDropIndex === null && layout.THUMBNAIL_RECTS.length > 0) {
                 newDropIndex = state.scrollOffset + layout.THUMBNAIL_RECTS.length;
            }
            if(state.dropTargetIndex !== newDropIndex) {
                state.dropTargetIndex = newDropIndex;
                needsRedraw = true;
            }
        } else {
            const prevHoveredPlayhead = state.hoveredPlayhead;
            const playheadRect: Rect = { x: layout.TIMELINE_RECT.x + state.animationProgress * layout.TIMELINE_RECT.width - 5, y: layout.TIMELINE_RECT.y, width: 10, height: layout.TIMELINE_RECT.height };
            state.hoveredPlayhead = isInside(mousePos, playheadRect);
            if(prevHoveredPlayhead !== state.hoveredPlayhead) needsRedraw = true;

            const prevHoveredMarker = state.hoveredMarkerIndex;
            let newHoveredMarker = null;
            for (let i = 0; i < state.keyframes.length; i++) {
                const markerRect = getTimelineMarkerRect(state.keyframes[i], layout.TIMELINE_RECT);
                if (isInside(mousePos, markerRect)) {
                    newHoveredMarker = i;
                    break;
                }
            }
            state.hoveredMarkerIndex = newHoveredMarker;
            if(prevHoveredMarker !== state.hoveredMarkerIndex) needsRedraw = true;

            const prevHoveredThumbnail = state.hoveredThumbnailIndex;
            let newHoveredThumbnail = null;
            for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
                if (isInside(mousePos, layout.THUMBNAIL_RECTS[i])) {
                    newHoveredThumbnail = state.scrollOffset + i;
                    break;
                }
            }
            state.hoveredThumbnailIndex = newHoveredThumbnail;
            if(prevHoveredThumbnail !== state.hoveredThumbnailIndex) needsRedraw = true;

            const prevHoveredDeleteIcon = state.hoveredDeleteIconIndex;
            let newHoveredDeleteIcon = null;
            if (state.hoveredThumbnailIndex !== null) {
                const thumbRect = layout.THUMBNAIL_RECTS[state.hoveredThumbnailIndex - state.scrollOffset];
                if (thumbRect) {
                    const deleteRect = getDeleteButtonRect(thumbRect);
                    if (isInside(mousePos, deleteRect)) {
                        newHoveredDeleteIcon = state.hoveredThumbnailIndex;
                    }
                }
            }
            state.hoveredDeleteIconIndex = newHoveredDeleteIcon;
            if(prevHoveredDeleteIcon !== state.hoveredDeleteIconIndex) needsRedraw = true;

            const prevHoveredScrollLeft = state.hoveredScrollLeft;
            state.hoveredScrollLeft = isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT);
            if(prevHoveredScrollLeft !== state.hoveredScrollLeft) needsRedraw = true;
            
            const prevHoveredScrollRight = state.hoveredScrollRight;
            state.hoveredScrollRight = isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT);
            if(prevHoveredScrollRight !== state.hoveredScrollRight) needsRedraw = true;
        }

        if (needsRedraw) {
            redrawUICanvas();
        }
    });

    // MOUSE UP
    const handleMouseUp = () => {
        if (state.draggedPointKey) {
            autoSaveCurrentPoseIfActive(state);
        }
        state.isDraggingGround = false;
        state.isDraggingVerticalGuide = false;
        state.draggedPointKey = null;
        state.draggedEndEffector = null;
        state.isDraggingPlayhead = false;
        
        if (state.draggedMarkerIndex !== null) {
            // The time has already been updated in the mousemove handler.
            // We just need to finalize the state and redraw.
            state.draggedMarkerIndex = null;
            updateUI();
        }

        if (state.draggedThumbnailIndex !== null) {
            if (state.dropTargetIndex !== null && state.dropTargetIndex !== state.draggedThumbnailIndex) {
                 const item = state.keyframes.splice(state.draggedThumbnailIndex, 1)[0];
                 const targetIndex = (state.dropTargetIndex > state.draggedThumbnailIndex) ? state.dropTargetIndex -1 : state.dropTargetIndex;
                 state.keyframes.splice(targetIndex, 0, item);
                 redistributeKeyframeTimes(state.keyframes);
                 state.activeKeyframeIndex = targetIndex;
            }
            state.draggedThumbnailIndex = null;
            state.dropTargetIndex = null;
            updateUI();
        }
    };
    document.addEventListener('mouseup', handleMouseUp);


    // MOUSE LEAVE
    posingCanvas.addEventListener('mouseleave', () => {
        state.currentMousePos = null;
        if (!state.draggedPointKey && !state.draggedEndEffector && !state.isDraggingGround && !state.isDraggingVerticalGuide) {
            if(state.hoveredJointKey || state.hoveredGround || state.hoveredVerticalGuide) {
                state.hoveredJointKey = null;
                state.hoveredGround = false;
                state.hoveredVerticalGuide = false;
                redrawPosingCanvas();
            }
        }
    });
    uiCanvas.addEventListener('mouseleave', () => {
        state.currentMousePos = null;
        if (!state.isDraggingPlayhead && !state.draggedMarkerIndex && !state.draggedThumbnailIndex) {
            if (state.hoveredMarkerIndex !== null || state.hoveredPlayhead || state.hoveredThumbnailIndex !== null || state.hoveredDeleteIconIndex !== null || state.hoveredScrollLeft || state.hoveredScrollRight) {
                state.hoveredMarkerIndex = null;
                state.hoveredPlayhead = false;
                state.hoveredThumbnailIndex = null;
                state.hoveredDeleteIconIndex = null;
                state.hoveredScrollLeft = false;
                state.hoveredScrollRight = false;
                redrawUICanvas();
            }
        }
    });

    // WHEEL
    uiCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const scrollAmount = Math.sign(e.deltaY);
        state.scrollOffset = Math.min(
            Math.max(0, state.scrollOffset + scrollAmount),
            Math.max(0, state.keyframes.length - layout.VISIBLE_THUMBNAILS)
        );
        updateUI();
    });

    // KEYDOWN
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
                updateUI();
            }
        }
    });
}