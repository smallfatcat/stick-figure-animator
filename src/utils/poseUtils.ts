import { StickFigurePose } from '../types';

/**
 * Creates a deep copy of a pose using JSON serialization
 * This is a common pattern used throughout the codebase
 */
export function deepCopyPose(pose: StickFigurePose): StickFigurePose {
    return JSON.parse(JSON.stringify(pose));
}

/**
 * Validates that a pose has the required structure
 */
export function validatePose(pose: any): pose is StickFigurePose {
    return (
        pose &&
        typeof pose === 'object' &&
        pose.hip &&
        typeof pose.hip.x === 'number' &&
        typeof pose.hip.y === 'number' &&
        pose.angles &&
        typeof pose.angles === 'object'
    );
}

/**
 * Ensures a pose has all required angles with sensible defaults
 */
export function ensurePoseCompatibility(pose: StickFigurePose): StickFigurePose {
    // Handle conversion from older versions that only had 'neck' to new 'neckBase' + 'neck' structure
    if (pose.angles.neck !== undefined && pose.angles.neckBase === undefined) {
        // Convert old neck angle to neckBase and set neck to default
        pose.angles.neckBase = pose.angles.neck;
        pose.angles.neck = -Math.PI / 2; // Default neck angle pointing straight up
    }
    
    // Ensure all required angles exist with sensible defaults
    const requiredAngles = {
        // New neck structure (v1.1.0+)
        neckBase: Math.PI / 2, // Pointing straight up
        neck: Math.PI / 2,     // Pointing straight up
        head: Math.PI / 2,     // Pointing straight up
        
        // Arms
        leftElbow: -Math.PI / 4,  // Slight bend
        rightElbow: Math.PI / 4,  // Slight bend
        leftHand: -Math.PI / 6,   // Slight bend
        rightHand: Math.PI / 6,   // Slight bend
        
        // Legs
        leftKnee: Math.PI / 6,    // Slight bend
        rightKnee: Math.PI / 6,   // Slight bend
        leftFoot: 0,              // Horizontal
        rightFoot: 0,             // Horizontal
        leftToe: Math.PI,         // Pointing left
        rightToe: 0               // Pointing right
    };
    
    // Add missing angles with defaults
    for (const [angleName, defaultValue] of Object.entries(requiredAngles)) {
        if (pose.angles[angleName] === undefined) {
            pose.angles[angleName] = defaultValue;
        }
    }
    
    return pose;
}

/**
 * Creates a default pose with all required angles
 */
export function createDefaultPose(): StickFigurePose {
    return {
        hip: { x: 400, y: 300 },
        angles: {
            neckBase: Math.PI / 2,
            neck: Math.PI / 2,
            head: Math.PI / 2,
            leftElbow: -Math.PI / 4,
            rightElbow: Math.PI / 4,
            leftHand: -Math.PI / 6,
            rightHand: Math.PI / 6,
            leftKnee: Math.PI / 6,
            rightKnee: Math.PI / 6,
            leftFoot: 0,
            rightFoot: 0,
            leftToe: Math.PI,
            rightToe: 0
        }
    };
} 