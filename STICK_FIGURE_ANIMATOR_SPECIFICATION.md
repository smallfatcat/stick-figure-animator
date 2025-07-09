# Stick Figure Animator - Technical Specification

## Overview

The Stick Figure Animator is a web-based 2D animation tool that allows users to create frame-by-frame animations of stick figures. The application provides both forward kinematics (FK) and inverse kinematics (IK) for posing, keyframe-based animation, onion skinning, and motion trails.

## Architecture

### Technology Stack
- **Frontend**: TypeScript, HTML5 Canvas, Vite
- **Build Tool**: Vite
- **Deployment**: GitHub Pages
- **Version**: 1.2.0 (Alpha)

### Core Architecture Pattern
The application follows a modular state management pattern with:
- **Refactored State**: Centralized state management with modular sub-states
- **Legacy Adapter**: Two-way adapter for backward compatibility
- **Service Layer**: Business logic separated into services
- **Event Handlers**: Mouse and keyboard interaction handling
- **Renderer**: Canvas-based rendering system

## Core Data Structures

### StickFigurePose
```typescript
type StickFigurePose = {
    hip: Point; // Root position of the figure
    angles: { [key: string]: number }; // Absolute angle for each joint
};
```

### Keyframe
```typescript
type Keyframe = {
    pose: StickFigurePose;
    time: number; // Normalized time (0.0 to 1.0)
};
```

### StickFigurePoints
```typescript
type StickFigurePoints = {
    head: Point; neck: Point; neckBase: Point; hip: Point;
    leftHand: Point; leftElbow: Point;
    rightHand: Point; rightElbow: Point;
    leftFoot: Point; leftKnee: Point; leftToe: Point;
    rightFoot: Point; rightKnee: Point; rightToe: Point;
};
```

## State Management

### RefactoredAppState
The main application state is organized into focused modules:

#### Core Data
- `stickFigurePose`: Current pose of the stick figure
- `keyframes`: Array of keyframes
- `activeKeyframeIndex`: Currently selected keyframe
- `groundY`: Y-position of the ground line
- `verticalGuideX`: X-position of the vertical guide

#### Animation State
- `isAnimating`: Whether animation is currently playing
- `isPaused`: Whether animation is paused
- `animationMode`: 'loop' or 'ping-pong'
- `animationProgress`: Current animation progress (0.0 to 1.0)
- `animationTotalDuration`: Total animation duration in milliseconds
- `timeDisplayMode`: 'seconds' or 'frames'

#### UI State
- `currentMousePos`: Current mouse position
- `hoveredThumbnailIndex`: Hovered thumbnail in timeline
- `hoveredDeleteIconIndex`: Hovered delete button
- `scrollOffset`: Timeline scroll position
- `dropTargetIndex`: Drag and drop target

#### Drag State
- `draggedPointKey`: Currently dragged joint
- `isDraggingGround`: Whether ground line is being dragged
- `isDraggingVerticalGuide`: Whether vertical guide is being dragged
- `isDraggingPlayhead`: Whether timeline playhead is being dragged
- `draggedEndEffector`: Currently dragged IK end effector

#### Onion State
- `isOnionModeEnabled`: Whether onion skinning is enabled
- `onionSkinBefore`: Number of previous frames to show
- `onionSkinAfter`: Number of next frames to show
- `isFullOnionSkinEnabled`: Whether motion trail is enabled
- `motionTrailResolution`: Resolution of motion trail

#### IK State
- `isIKModeEnabled`: Whether IK mode is enabled
- `draggedEndEffector`: Currently dragged IK end effector

## Keyframe Management

### Keyframe Creation Logic

The keyframe creation system handles several scenarios:

1. **First Keyframe**: Creates keyframe at time 0.0
2. **Second Keyframe**: Creates keyframe at time 1.0
3. **Subsequent Keyframes**: Creates keyframe at current animation progress
4. **Time Collision**: If a keyframe exists at the target time, inserts halfway to the next keyframe
5. **End Extension**: If adding at the end, extends animation duration by 1 second

### Keyframe Deletion Logic

When deleting keyframes:
1. **Active Keyframe**: Deselects and resets to default pose
2. **Last Keyframe**: Adjusts animation duration and renormalizes times
3. **Middle Keyframe**: Preserves absolute timing of remaining keyframes
4. **Single Keyframe**: Resets to time 0.0

### Time Normalization

Keyframes use normalized time (0.0 to 1.0) for interpolation:
- `redistributeKeyframeTimes()`: Evenly distributes keyframes
- `renormalizeKeyframeTimes()`: Normalizes based on first and last keyframe
- Automatic renormalization when extending animation duration

## Dragging and Interaction

### Joint Dragging (Forward Kinematics)

**Detection**: Mouse click within grab radius (15px) of joint
**Behavior**: 
- Updates joint angle based on mouse position relative to parent
- Hip joint moves the entire figure
- Other joints rotate around their parent joint
- Real-time pose updates during drag

### IK Dragging (Inverse Kinematics)

**End Effectors**: `leftHand`, `rightHand`, `leftFoot`, `rightFoot`, `leftToe`, `rightToe`
**Algorithm**: Two-joint IK using law of cosines
**Chains**:
- Arms: `neckBase` → `elbow` → `hand`
- Legs: `hip` → `knee` → `foot`
- Toes: `foot` → `toe`

### Guide Dragging

**Ground Line**: Draggable horizontal line with 10px grab buffer
**Vertical Guide**: Draggable vertical line with 10px grab buffer
**Constraints**: Bounded within canvas dimensions

### Timeline Dragging

**Playhead**: Draggable timeline indicator for scrubbing
**Keyframe Markers**: Draggable to reorder keyframes
**Thumbnails**: Draggable for reordering with drop indicators

## Animation System

### Interpolation

**Linear Interpolation**: For position and scalar values
**Angle Interpolation**: Handles shortest path between angles
**Pose Interpolation**: Interpolates all joint angles and hip position

### Animation Modes

1. **Loop**: Continuous forward playback
2. **Ping-pong**: Forward then reverse playback

### Animation Loop

**Frame Rate**: 60 FPS using `requestAnimationFrame`
**Progress Calculation**: Based on elapsed time and total duration
**Pose Updates**: Real-time pose interpolation during playback
**UI Updates**: Continuous redraw of both posing and UI canvases

### Motion Trail

**Generation**: Pre-renders all interpolated frames to offscreen canvas
**Resolution**: Configurable step size for performance
**Opacity**: Dynamic based on number of frames being drawn
**Performance**: Cached trail canvas for smooth playback

## Rendering System

### Canvas Setup

**Posing Canvas**: 800x540px for main figure
**UI Canvas**: 800x120px for timeline and controls
**Offscreen Canvas**: For motion trail generation

### Drawing Pipeline

1. **Background**: Clear canvas
2. **Motion Trail**: Draw cached trail if enabled
3. **Onion Skins**: Draw previous/next frames if enabled
4. **Main Figure**: Draw current pose
5. **Guides**: Draw ground line and vertical guide
6. **UI Elements**: Draw timeline, thumbnails, controls

### Thumbnail Rendering

**Scale**: Thumbnails scaled to fit timeline
**Live Updates**: Active keyframe shows current pose
**Time Display**: Shows time in seconds or frames
**Delete Buttons**: Hover-sensitive delete icons

## Kinematics System

### Forward Kinematics (FK)

**Hierarchy**: Parent-child joint relationships
**Bone Lengths**: Pre-calculated distances between joints
**Point Calculation**: Recursive traversal from hip to extremities
**Angle Storage**: Absolute angles for each joint

### Inverse Kinematics (IK)

**Two-Joint Solver**: Law of cosines for arm/leg chains
**Single-Joint Solver**: Direct angle calculation for toes
**Target Clamping**: Prevents over-extension
**Fallback**: Returns null if IK solution fails

### Joint Hierarchy

```
hip
├── neckBase
│   ├── neck
│   │   └── head
│   ├── leftElbow
│   │   └── leftHand
│   └── rightElbow
│       └── rightHand
├── leftKnee
│   └── leftFoot
│       └── leftToe
└── rightKnee
    └── rightFoot
        └── rightToe
```

## Event Handling

### Mouse Events

**Posing Canvas**:
- `mousedown`: Joint selection, guide dragging, keyframe creation
- `mousemove`: Joint dragging, IK solving, hover detection
- `mouseup`: End dragging operations

**UI Canvas**:
- `mousedown`: Timeline interaction, thumbnail selection
- `mousemove`: Hover detection, drag operations
- `mouseup`: End timeline operations

### Keyboard Events

**Space**: Play/pause animation
**Delete**: Delete selected keyframe
**Escape**: Cancel current operation

## Services

### KeyframeService
- `addKeyframe()`: Creates new keyframe with smart timing
- `deleteKeyframe()`: Removes keyframe with state cleanup
- `autoSaveCurrentPoseIfActive()`: Saves current pose to active keyframe
- `redistributeKeyframeTimes()`: Evenly distributes keyframes

### AnimationService
- `startAnimation()`: Begins animation playback
- `stopAnimation()`: Stops and resets animation
- `pauseAnimation()`: Pauses current animation
- `resumeAnimation()`: Resumes paused animation

### UIService
- Timeline management
- Thumbnail rendering
- Control state updates

## Performance Optimizations

### Caching
- **Motion Trail**: Pre-rendered to offscreen canvas
- **Pose Calculations**: Cached point calculations
- **Canvas Context**: Reused context objects

### Rendering
- **Selective Redraws**: Only redraw changed areas
- **Frame Rate Control**: 60 FPS animation loop
- **Canvas Scaling**: Efficient thumbnail scaling

### Memory Management
- **Object Pooling**: Reused pose objects
- **Garbage Collection**: Proper cleanup of offscreen canvases
- **State Immutability**: Deep copying for state updates

## File Structure

```
src/
├── state/           # State management modules
├── services/        # Business logic services
├── handlers/        # Event handling
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── animation.ts     # Animation interpolation
├── animationLoop.ts # Animation playback loop
├── keyframeManager.ts # Keyframe management
├── kinematics.ts    # Forward kinematics
├── inverseKinematics.ts # Inverse kinematics
├── drawing.ts       # Canvas drawing functions
├── renderer.ts      # Main rendering pipeline
├── ui.ts           # UI layout and drawing
├── controls.ts      # Control state management
├── dom.ts          # DOM element references
├── eventHandlers.ts # Event handler setup
└── icons.ts        # UI icon definitions
```

## Key Features

1. **Frame-by-Frame Animation**: Keyframe-based animation system
2. **Forward Kinematics**: Direct joint manipulation
3. **Inverse Kinematics**: End effector dragging
4. **Onion Skinning**: Show previous/next frames
5. **Motion Trail**: Full animation preview
6. **Timeline Scrubbing**: Real-time animation preview
7. **Keyframe Reordering**: Drag and drop timeline
8. **Export/Import**: Animation data persistence
9. **Multiple Animation Modes**: Loop and ping-pong
10. **Visual Guides**: Ground line and vertical guide

## Technical Constraints

- **Browser Compatibility**: Modern browsers with Canvas support
- **Performance**: 60 FPS animation target
- **Memory**: Efficient canvas and object management
- **State Consistency**: Modular state with backward compatibility
- **User Experience**: Responsive interaction with visual feedback 