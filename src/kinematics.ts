import { StickFigurePose, StickFigurePoints } from './types';

/**
 * A comprehensive type for the kinematic model, including hierarchy, bone lengths, and the default pose.
 */
export type KinematicsData = {
    hierarchy: { [key: string]: string };
    children: { [key: string]: string[] };
    boneLengths: { [key: string]: number };
    defaultPose: StickFigurePose;
    canvasWidth: number;
    posingAreaHeight: number;
};


/**
 * Calculates the absolute XY coordinates for each joint based on an angle-based pose.
 * This is our Forward Kinematics (FK) function.
 * @returns A StickFigurePoints object.
 */
export function calculatePointsFromPose(
    pose: StickFigurePose,
    _hierarchy: { [key: string]: string },
    boneLengths: { [key: string]: number },
    children: { [key: string]: string[] }
): StickFigurePoints {
    const points: Partial<StickFigurePoints> = { hip: { ...pose.hip } };
    const jointsToProcess: (keyof StickFigurePoints)[] = ['hip'];

    while (jointsToProcess.length > 0) {
        const parentKey = jointsToProcess.shift()!;
        const parentPos = points[parentKey]!;
        const childrenOfParent = children[parentKey] || [];

        for (const childKey of childrenOfParent) {
            const angle = pose.angles[childKey];
            const length = boneLengths[`${childKey}-${parentKey}`];
            if (angle !== undefined && length !== undefined) {
                points[childKey as keyof StickFigurePoints] = {
                    x: parentPos.x + Math.cos(angle) * length,
                    y: parentPos.y + Math.sin(angle) * length,
                };
                jointsToProcess.push(childKey as keyof StickFigurePoints);
            }
        }
    }
    return points as StickFigurePoints;
}

/**
 * Calculates an initial angle-based pose from a set of points.
 * Used once at startup to create the default pose.
 * @returns A StickFigurePose object.
 */
export function calculatePoseFromPoints(
    points: StickFigurePoints,
    hierarchy: { [key: string]: string }
): StickFigurePose {
    const pose: StickFigurePose = {
        hip: { ...points.hip },
        angles: {},
    };

    for (const childKey in hierarchy) {
        const parentKey = hierarchy[childKey];
        const childPos = points[childKey as keyof StickFigurePoints];
        const parentPos = points[parentKey as keyof StickFigurePoints];

        const dx = childPos.x - parentPos.x;
        const dy = childPos.y - parentPos.y;
        pose.angles[childKey] = Math.atan2(dy, dx);
    }
    return pose;
}

export function createDefaultKinematics(canvasWidth: number, posingAreaHeight: number): KinematicsData {
    const centerX = canvasWidth / 2;
    const centerY = posingAreaHeight / 2;

    const defaultPoints: StickFigurePoints = {
        head:      { x: centerX, y: centerY - 80 },
        neck:      { x: centerX, y: centerY - 60 },
        neckBase:  { x: centerX, y: centerY - 40 },
        hip:       { x: centerX, y: centerY + 20 },
        leftElbow: { x: centerX - 30, y: centerY - 20 },
        leftHand:  { x: centerX - 60, y: centerY + 10 },
        rightElbow:{ x: centerX + 30, y: centerY - 20 },
        rightHand: { x: centerX + 60, y: centerY + 10 },
        leftKnee:  { x: centerX - 20, y: centerY + 65 },
        leftFoot:  { x: centerX - 30, y: centerY + 110 },
        leftToe:   { x: centerX - 50, y: centerY + 110 },
        rightKnee: { x: centerX + 20, y: centerY + 65 },
        rightFoot: { x: centerX + 30, y: centerY + 110 },
        rightToe:  { x: centerX + 50, y: centerY + 110 },
    };

    const hierarchy: { [key: string]: string } = {
        neckBase: 'hip', neck: 'neckBase', head: 'neck',
        leftElbow: 'neckBase', rightElbow: 'neckBase',
        leftHand: 'leftElbow', rightHand: 'rightElbow',
        leftKnee: 'hip', rightKnee: 'hip',
        leftFoot: 'leftKnee', rightFoot: 'rightKnee',
        leftToe: 'leftFoot', rightToe: 'rightFoot',
    };

    const children: { [key: string]: string[] } = {};
    for (const child in hierarchy) {
        const parent = hierarchy[child as keyof typeof hierarchy]!;
        if (!children[parent]) children[parent] = [];
        children[parent].push(child);
    }

    const boneLengths: { [key: string]: number } = {};
    for (const child in hierarchy) {
        const childKey = child as keyof StickFigurePoints;
        const parentKey = hierarchy[childKey] as keyof StickFigurePoints;
        boneLengths[`${childKey}-${parentKey}`] = Math.hypot(defaultPoints[childKey].x - defaultPoints[parentKey].x, defaultPoints[childKey].y - defaultPoints[parentKey].y);
    }

    const defaultPose = calculatePoseFromPoints(defaultPoints, hierarchy);

    return { hierarchy, children, boneLengths, defaultPose, canvasWidth, posingAreaHeight };
}
