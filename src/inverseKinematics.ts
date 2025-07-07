import { Point, StickFigurePose, StickFigurePoints } from './types';
import { KinematicsData, calculatePointsFromPose } from './kinematics';

/**
 * Robust 2D two-bone IK using law of cosines.
 * Returns [joint1WorldAngle, joint2WorldAngle]
 */
function solveTwoJointIK(
    target: Point,
    base: Point,
    bone1Length: number,
    bone2Length: number
): [number, number] | null {
    const dx = target.x - base.x;
    const dy = target.y - base.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.max(1e-6, Math.min(dist, bone1Length + bone2Length - 1e-6));

    // Law of cosines
    const a1 = Math.acos(
        (bone1Length * bone1Length + clampedDist * clampedDist - bone2Length * bone2Length) /
        (2 * bone1Length * clampedDist)
    );
    const a2 = Math.acos(
        (bone1Length * bone1Length + bone2Length * bone2Length - clampedDist * clampedDist) /
        (2 * bone1Length * bone2Length)
    );

    // Global angle to target
    const baseToTarget = Math.atan2(dy, dx);

    // Joint angles in world space
    const joint1 = baseToTarget - a1; // shoulder/hip
    const joint2 = joint1 + (Math.PI - a2); // elbow/knee (world angle)

    return [joint1, joint2];
}

/**
 * Solves inverse kinematics for a specific end effector.
 * @param targetPoint The target position for the end effector
 * @param endEffector The name of the end effector joint
 * @param pose The current pose
 * @param kinematics The kinematics data
 * @returns Updated pose with new angles, or null if IK failed
 */
export function solveIKForEndEffector(
    targetPoint: Point,
    endEffector: keyof StickFigurePoints,
    pose: StickFigurePose,
    kinematics: KinematicsData
): StickFigurePose | null {
    const newPose = JSON.parse(JSON.stringify(pose)) as StickFigurePose;
    
    // Get current points to find base positions
    const currentPoints = calculatePointsFromPose(pose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
    
    // Define IK chains for each end effector
    const ikChains: { [key: string]: { base: keyof StickFigurePoints; joints: string[] } } = {
        leftHand: { base: 'neck', joints: ['leftElbow', 'leftHand'] },
        rightHand: { base: 'neck', joints: ['rightElbow', 'rightHand'] },
        leftFoot: { base: 'hip', joints: ['leftKnee', 'leftFoot'] },
        rightFoot: { base: 'hip', joints: ['rightKnee', 'rightFoot'] },
        leftToe: { base: 'leftFoot', joints: ['leftToe'] },
        rightToe: { base: 'rightFoot', joints: ['rightToe'] }
    };
    
    const chain = ikChains[endEffector];
    if (!chain) {
        return null;
    }
    
    const basePos = currentPoints[chain.base];
    if (!basePos) {
        return null;
    }
    
    if (chain.joints.length === 1) {
        // Single joint IK (for toes)
        const joint = chain.joints[0];
        const boneLength = kinematics.boneLengths[`${joint}-${chain.base}`];
        
        if (boneLength !== undefined) {
            const dx = targetPoint.x - basePos.x;
            const dy = targetPoint.y - basePos.y;
            newPose.angles[joint] = Math.atan2(dy, dx);
        }
    } else if (chain.joints.length === 2) {
        // Two-joint IK (for arms and legs)
        const [joint1, joint2] = chain.joints;
        const bone1Length = kinematics.boneLengths[`${joint1}-${chain.base}`];
        const bone2Length = kinematics.boneLengths[`${joint2}-${joint1}`];
        
        if (bone1Length !== undefined && bone2Length !== undefined) {
            const angles = solveTwoJointIK(targetPoint, basePos, bone1Length, bone2Length);
            if (angles) {
                newPose.angles[joint1] = angles[0];
                newPose.angles[joint2] = angles[1];
            }
        }
    }
    
    return newPose;
}

/**
 * Checks if a point is an end effector that can be used for IK.
 * @param pointKey The point key to check
 * @returns True if the point is an end effector
 */
export function isEndEffector(pointKey: keyof StickFigurePoints): boolean {
    const endEffectors: (keyof StickFigurePoints)[] = [
        'leftHand', 'rightHand', 'leftFoot', 'rightFoot', 'leftToe', 'rightToe'
    ];
    return endEffectors.includes(pointKey);
}

/**
 * Gets the IK chain for a given end effector.
 * @param endEffector The end effector joint name
 * @returns The IK chain definition
 */
export function getIKChain(endEffector: keyof StickFigurePoints): { base: string; joints: string[] } | null {
    const ikChains: { [key: string]: { base: string; joints: string[] } } = {
        leftHand: { base: 'neck', joints: ['leftElbow', 'leftHand'] },
        rightHand: { base: 'neck', joints: ['rightElbow', 'rightHand'] },
        leftFoot: { base: 'hip', joints: ['leftKnee', 'leftFoot'] },
        rightFoot: { base: 'hip', joints: ['rightKnee', 'rightFoot'] },
        leftToe: { base: 'leftFoot', joints: ['leftToe'] },
        rightToe: { base: 'rightFoot', joints: ['rightToe'] }
    };
    
    return ikChains[endEffector] || null;
} 