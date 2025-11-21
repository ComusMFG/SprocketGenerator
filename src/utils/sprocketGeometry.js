/**
 * Sprocket Geometry Calculator
 *
 * Implements standard sprocket geometry formulas for film transport mechanisms.
 * All calculations are in millimeters internally.
 */

/**
 * Calculate the Pitch Diameter (PD)
 * Formula: PD = P / sin(180/N)
 *
 * @param {number} pitch - Film pitch (distance between perforation centers) in mm
 * @param {number} numTeeth - Number of teeth on the sprocket
 * @returns {number} Pitch diameter in mm
 */
export function calculatePitchDiameter(pitch, numTeeth) {
  if (numTeeth < 3) return 0;
  const angleRad = (Math.PI / numTeeth);
  return pitch / Math.sin(angleRad);
}

/**
 * Calculate the Outer Diameter (OD)
 * The outer diameter includes the roller/pin diameter
 *
 * @param {number} pitchDiameter - Pitch diameter in mm
 * @param {number} rollerDiameter - Roller/pin diameter in mm
 * @returns {number} Outer diameter in mm
 */
export function calculateOuterDiameter(pitchDiameter, rollerDiameter) {
  // OD = PD + Dr (addendum is approximately half the roller diameter)
  return pitchDiameter + rollerDiameter;
}

/**
 * Calculate the Root Diameter (RD)
 * The root diameter is where the bottom of the tooth gullet sits
 *
 * @param {number} pitchDiameter - Pitch diameter in mm
 * @param {number} rollerDiameter - Roller/pin diameter in mm
 * @returns {number} Root diameter in mm
 */
export function calculateRootDiameter(pitchDiameter, rollerDiameter) {
  // Root diameter accounts for the roller seating depth
  return pitchDiameter - rollerDiameter;
}

/**
 * Calculate the angular position of each tooth
 *
 * @param {number} numTeeth - Number of teeth
 * @returns {number[]} Array of angles in radians
 */
export function calculateToothAngles(numTeeth) {
  const angles = [];
  const angleStep = (2 * Math.PI) / numTeeth;
  for (let i = 0; i < numTeeth; i++) {
    angles.push(i * angleStep - Math.PI / 2); // Start from top
  }
  return angles;
}

/**
 * Generate a point on a circle
 *
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} radius - Circle radius
 * @param {number} angle - Angle in radians
 * @returns {{x: number, y: number}} Point coordinates
 */
export function pointOnCircle(centerX, centerY, radius, angle) {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  };
}

/**
 * Generate an arc path segment
 *
 * @param {number} rx - X radius
 * @param {number} ry - Y radius
 * @param {number} xAxisRotation - X-axis rotation
 * @param {number} largeArcFlag - Large arc flag (0 or 1)
 * @param {number} sweepFlag - Sweep flag (0 or 1)
 * @param {number} x - End X coordinate
 * @param {number} y - End Y coordinate
 * @returns {string} SVG arc command
 */
export function arcCommand(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
  return `A ${rx.toFixed(4)} ${ry.toFixed(4)} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${x.toFixed(4)} ${y.toFixed(4)}`;
}

/**
 * Generate the complete sprocket tooth profile with proper protruding teeth
 *
 * Film sprocket teeth are pins that extend outward to engage with film perforations.
 * The tooth height should be significant enough to properly engage the film.
 *
 * @param {Object} params - Sprocket parameters
 * @param {number} params.numTeeth - Number of teeth
 * @param {number} params.pitch - Film pitch in mm
 * @param {number} params.rollerDiameter - Roller/pin diameter in mm
 * @param {number} params.boreDiameter - Center bore diameter in mm
 * @returns {Object} SVG path data and calculated dimensions
 */
export function generateSprocketPath(params) {
  const { numTeeth, pitch, rollerDiameter, boreDiameter } = params;

  if (numTeeth < 3 || pitch <= 0 || rollerDiameter <= 0) {
    return { path: '', dimensions: null };
  }

  const pitchDiameter = calculatePitchDiameter(pitch, numTeeth);
  const pitchRadius = pitchDiameter / 2;
  const rollerRadius = rollerDiameter / 2;

  // Tooth dimensions
  const toothHeight = rollerDiameter * 2.0; // Height of tooth above base

  // Key radii
  const baseRadius = pitchRadius - rollerRadius * 0.5; // Main body radius
  const outerRadius = baseRadius + toothHeight; // Tip of teeth
  const rootRadius = baseRadius - rollerRadius * 1.2; // Bottom of gullet

  const outerDiameter = outerRadius * 2;
  const rootDiameter = rootRadius * 2;

  const centerX = 0;
  const centerY = 0;

  const angleStep = (2 * Math.PI) / numTeeth;

  // Tooth width as a fraction of spacing between teeth
  const toothWidthFraction = 0.30;
  const halfToothAngle = (angleStep * toothWidthFraction) / 2;

  let pathData = '';

  for (let i = 0; i < numTeeth; i++) {
    // Angle to the center of this tooth
    const toothAngle = i * angleStep - Math.PI / 2; // Start from top

    // Angle to the midpoint between this tooth and the next (gullet center)
    const gulletAngle = toothAngle + angleStep / 2;

    // Tooth tip points (outer edge) - narrower at tip
    const tipNarrowFactor = 0.6;
    const toothTipLeft = pointOnCircle(centerX, centerY, outerRadius, toothAngle - halfToothAngle * tipNarrowFactor);
    const toothTipRight = pointOnCircle(centerX, centerY, outerRadius, toothAngle + halfToothAngle * tipNarrowFactor);

    // Tooth base points (where tooth meets body)
    const toothBaseLeft = pointOnCircle(centerX, centerY, baseRadius, toothAngle - halfToothAngle);
    const toothBaseRight = pointOnCircle(centerX, centerY, baseRadius, toothAngle + halfToothAngle);

    // Gullet bottom point (deepest part between teeth)
    const gulletBottom = pointOnCircle(centerX, centerY, rootRadius, gulletAngle);

    // Next tooth's base left point
    const nextToothAngle = ((i + 1) % numTeeth) * angleStep - Math.PI / 2;
    const nextToothBaseLeft = pointOnCircle(centerX, centerY, baseRadius, nextToothAngle - halfToothAngle);

    if (i === 0) {
      // Start at the left flank of the first tooth (at base level)
      pathData = `M ${toothBaseLeft.x.toFixed(4)} ${toothBaseLeft.y.toFixed(4)} `;
    }

    // Draw left flank of tooth (up from base to tip)
    pathData += `L ${toothTipLeft.x.toFixed(4)} ${toothTipLeft.y.toFixed(4)} `;

    // Draw rounded tooth tip
    pathData += arcCommand(
      rollerRadius * 0.4, rollerRadius * 0.4,
      0, 0, 1,
      toothTipRight.x, toothTipRight.y
    ) + ' ';

    // Draw right flank of tooth (down from tip to base)
    pathData += `L ${toothBaseRight.x.toFixed(4)} ${toothBaseRight.y.toFixed(4)} `;

    // Draw gullet curve (arc going inward to gullet bottom, then to next tooth)
    // Use a smooth arc that passes through the gullet bottom
    pathData += arcCommand(
      rollerRadius * 1.5, rollerRadius * 1.5,
      0, 0, 1,
      gulletBottom.x, gulletBottom.y
    ) + ' ';

    pathData += arcCommand(
      rollerRadius * 1.5, rollerRadius * 1.5,
      0, 0, 1,
      nextToothBaseLeft.x, nextToothBaseLeft.y
    ) + ' ';
  }

  // Close the path
  pathData += 'Z';

  return {
    path: pathData,
    borePath: generateBorePath(boreDiameter),
    dimensions: {
      pitchDiameter,
      outerDiameter,
      rootDiameter,
      pitchRadius,
      outerRadius,
      rootRadius,
      baseRadius,
      toothHeight
    }
  };
}

/**
 * Generate the bore (center hole) path
 *
 * @param {number} boreDiameter - Bore diameter in mm
 * @returns {string} SVG path for the bore
 */
export function generateBorePath(boreDiameter) {
  if (boreDiameter <= 0) return '';

  const r = boreDiameter / 2;
  // Create a circle using two arcs
  return `M ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0`;
}

/**
 * Generate grid lines for scale reference
 *
 * @param {number} size - Size of the grid area
 * @param {number} spacing - Grid line spacing
 * @returns {string} SVG path for grid
 */
export function generateGridPath(size, spacing) {
  let path = '';
  const halfSize = size / 2;
  const numLines = Math.ceil(size / spacing);

  for (let i = -numLines; i <= numLines; i++) {
    const pos = i * spacing;
    // Vertical lines
    path += `M ${pos} ${-halfSize} L ${pos} ${halfSize} `;
    // Horizontal lines
    path += `M ${-halfSize} ${pos} L ${halfSize} ${pos} `;
  }

  return path;
}

/**
 * Film presets with standard specifications
 */
export const FILM_PRESETS = {
  'standard8': {
    name: 'Standard 8mm',
    pitch: 3.81,
    rollerDiameter: 1.0,
    description: 'Standard 8mm film (Double 8)'
  },
  'super8': {
    name: 'Super 8',
    pitch: 4.23,
    rollerDiameter: 1.0,
    description: 'Super 8mm film format'
  },
  '16mm': {
    name: '16mm',
    pitch: 7.62,
    rollerDiameter: 1.5,
    description: 'Standard 16mm film'
  },
  '35mm': {
    name: '35mm',
    pitch: 4.75,
    rollerDiameter: 1.98,
    description: 'Standard 35mm motion picture film'
  }
};

/**
 * Unit conversion utilities
 */
export const UNITS = {
  mm: {
    name: 'Millimeters',
    symbol: 'mm',
    toMM: (val) => val,
    fromMM: (val) => val
  },
  inch: {
    name: 'Inches',
    symbol: 'in',
    toMM: (val) => val * 25.4,
    fromMM: (val) => val / 25.4
  }
};

/**
 * Convert value between units
 *
 * @param {number} value - Value to convert
 * @param {string} fromUnit - Source unit ('mm' or 'inch')
 * @param {string} toUnit - Target unit ('mm' or 'inch')
 * @returns {number} Converted value
 */
export function convertUnits(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;
  const mmValue = UNITS[fromUnit].toMM(value);
  return UNITS[toUnit].fromMM(mmValue);
}
