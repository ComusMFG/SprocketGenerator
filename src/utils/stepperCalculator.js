/**
 * Stepper Motor Calculator
 *
 * Calculates optimal step configurations for film transport mechanisms.
 */

/**
 * Calculate stepper motor metrics
 *
 * @param {number} motorSteps - Steps per revolution of the motor
 * @param {number} framesPerRotation - Target frames (teeth) per rotation
 * @param {number} microstepping - Microstepping divisor (1, 2, 4, 8, 16, 32)
 * @returns {Object} Calculation results
 */
export function calculateStepperMetrics(motorSteps, framesPerRotation, microstepping = 1) {
  if (framesPerRotation <= 0 || motorSteps <= 0) {
    return {
      stepsPerFrame: 0,
      isCleanDivision: false,
      totalSteps: 0,
      remainder: 0,
      accuracy: 0,
      recommendation: 'Invalid parameters'
    };
  }

  const totalSteps = motorSteps * microstepping;
  const stepsPerFrame = totalSteps / framesPerRotation;
  const remainder = totalSteps % framesPerRotation;
  const isCleanDivision = remainder === 0;

  // Calculate accuracy as a percentage
  const roundedSteps = Math.round(stepsPerFrame);
  const actualFrames = totalSteps / roundedSteps;
  const accuracy = (Math.min(actualFrames, framesPerRotation) / Math.max(actualFrames, framesPerRotation)) * 100;

  let recommendation = '';
  if (isCleanDivision) {
    recommendation = 'Excellent! Clean integer division.';
  } else if (accuracy > 99.5) {
    recommendation = 'Very good. Minimal cumulative error.';
  } else if (accuracy > 99) {
    recommendation = 'Acceptable. Consider adjusting tooth count.';
  } else {
    recommendation = 'Poor fit. Recommend changing frame count.';
  }

  return {
    stepsPerFrame,
    isCleanDivision,
    totalSteps,
    remainder,
    accuracy,
    recommendation,
    roundedStepsPerFrame: roundedSteps,
    cumulativeErrorPerRotation: isCleanDivision ? 0 : Math.abs(framesPerRotation - actualFrames)
  };
}

/**
 * Find optimal frame counts for a given motor configuration
 *
 * @param {number} motorSteps - Steps per revolution
 * @param {number} microstepping - Microstepping divisor
 * @param {number} minFrames - Minimum frame count to consider
 * @param {number} maxFrames - Maximum frame count to consider
 * @returns {number[]} Array of frame counts that divide evenly
 */
export function findOptimalFrameCounts(motorSteps, microstepping = 1, minFrames = 8, maxFrames = 100) {
  const totalSteps = motorSteps * microstepping;
  const optimalCounts = [];

  for (let frames = minFrames; frames <= maxFrames; frames++) {
    if (totalSteps % frames === 0) {
      optimalCounts.push(frames);
    }
  }

  return optimalCounts;
}

/**
 * Common stepper motor configurations
 */
export const MOTOR_PRESETS = {
  'nema17_200': {
    name: 'NEMA 17 (1.8deg)',
    stepsPerRevolution: 200,
    description: 'Standard 1.8 degree stepper'
  },
  'nema17_400': {
    name: 'NEMA 17 (0.9deg)',
    stepsPerRevolution: 400,
    description: 'High-resolution 0.9 degree stepper'
  },
  'nema23_200': {
    name: 'NEMA 23 (1.8deg)',
    stepsPerRevolution: 200,
    description: 'Larger format 1.8 degree stepper'
  },
  '28byj48': {
    name: '28BYJ-48',
    stepsPerRevolution: 2048,
    description: 'Common geared stepper motor'
  }
};

/**
 * Microstepping options
 */
export const MICROSTEPPING_OPTIONS = [
  { value: 1, label: 'Full Step (1x)' },
  { value: 2, label: 'Half Step (2x)' },
  { value: 4, label: '1/4 Step (4x)' },
  { value: 8, label: '1/8 Step (8x)' },
  { value: 16, label: '1/16 Step (16x)' },
  { value: 32, label: '1/32 Step (32x)' }
];
