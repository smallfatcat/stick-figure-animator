import { AppState } from '../state';
import { DOMElements } from '../dom';
import { Layout } from '../ui';
import { KinematicsData } from '../kinematics';
import { RedrawFunction } from '../types';
import { ButtonHandler } from './buttonHandlers';
import { MouseHandler } from './mouseHandlers';

export function setupEventHandlers(
    dom: DOMElements, 
    state: AppState, 
    layout: Layout, 
    kinematics: KinematicsData,
    updateUI: RedrawFunction,
    redrawPosingCanvas: RedrawFunction,
    redrawUICanvas: RedrawFunction
) {
    // Create button handler
    const buttonHandler = new ButtonHandler(
        dom,
        state,
        updateUI,
        redrawPosingCanvas,
        redrawUICanvas,
        kinematics,
        layout,
        dom.posingCanvas
    );

    // Create mouse handler
    const mouseHandler = new MouseHandler(
        dom,
        state,
        layout,
        kinematics,
        updateUI,
        redrawPosingCanvas,
        redrawUICanvas
    );

    // Setup all handlers
    buttonHandler.setupButtonHandlers();
    mouseHandler.setupMouseHandlers();
} 