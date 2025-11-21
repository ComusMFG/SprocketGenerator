import { useState, useMemo, useCallback, useRef } from 'react';
import {
  generateSprocketPath,
  generateGridPath,
  FILM_PRESETS,
  UNITS,
  convertUnits
} from './utils/sprocketGeometry';
import {
  calculateStepperMetrics,
  findOptimalFrameCounts,
  MICROSTEPPING_OPTIONS
} from './utils/stepperCalculator';

function App() {
  // Unit state
  const [unit, setUnit] = useState('mm');

  // Sprocket parameters (stored in mm internally)
  const [numTeeth, setNumTeeth] = useState(20);
  const [pitch, setPitch] = useState(4.23); // Super 8 default
  const [rollerDiameter, setRollerDiameter] = useState(1.0);
  const [boreDiameter, setBoreDiameter] = useState(5.0);

  // Stepper motor parameters
  const [motorSteps, setMotorSteps] = useState(200);
  const [microstepping, setMicrostepping] = useState(1);
  const [useStepperOverride, setUseStepperOverride] = useState(false);
  const [targetFrames, setTargetFrames] = useState(20);

  // SVG ref for export
  const svgRef = useRef(null);

  // Calculate effective tooth count (stepper override or manual)
  const effectiveTeeth = useStepperOverride ? targetFrames : numTeeth;

  // Generate sprocket geometry
  const sprocketData = useMemo(() => {
    return generateSprocketPath({
      numTeeth: effectiveTeeth,
      pitch,
      rollerDiameter,
      boreDiameter
    });
  }, [effectiveTeeth, pitch, rollerDiameter, boreDiameter]);

  // Calculate stepper metrics
  const stepperMetrics = useMemo(() => {
    return calculateStepperMetrics(motorSteps, effectiveTeeth, microstepping);
  }, [motorSteps, effectiveTeeth, microstepping]);

  // Find optimal frame counts
  const optimalFrames = useMemo(() => {
    return findOptimalFrameCounts(motorSteps, microstepping, 8, 60);
  }, [motorSteps, microstepping]);

  // Display value conversion
  const displayValue = useCallback((mmValue) => {
    const converted = convertUnits(mmValue, 'mm', unit);
    return unit === 'mm' ? converted.toFixed(2) : converted.toFixed(4);
  }, [unit]);

  // Input value conversion (to mm for storage)
  const toMM = useCallback((displayVal) => {
    return convertUnits(parseFloat(displayVal) || 0, unit, 'mm');
  }, [unit]);

  // Apply film preset
  const applyPreset = (presetKey) => {
    const preset = FILM_PRESETS[presetKey];
    setPitch(preset.pitch);
    setRollerDiameter(preset.rollerDiameter);
  };

  // SVG Export
  const exportSVG = () => {
    if (!svgRef.current || !sprocketData.dimensions) return;

    const { outerDiameter } = sprocketData.dimensions;
    const margin = 2;
    const size = outerDiameter + margin * 2;

    // Create a clean SVG for export
    const exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    exportSvg.setAttribute('viewBox', `${-size / 2} ${-size / 2} ${size} ${size}`);
    exportSvg.setAttribute('width', `${size}mm`);
    exportSvg.setAttribute('height', `${size}mm`);

    // Add sprocket path
    const sprocketPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sprocketPath.setAttribute('d', sprocketData.path);
    sprocketPath.setAttribute('fill', 'none');
    sprocketPath.setAttribute('stroke', '#000000');
    sprocketPath.setAttribute('stroke-width', '0.1');
    exportSvg.appendChild(sprocketPath);

    // Add bore path
    if (sprocketData.borePath) {
      const borePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      borePath.setAttribute('d', sprocketData.borePath);
      borePath.setAttribute('fill', 'none');
      borePath.setAttribute('stroke', '#000000');
      borePath.setAttribute('stroke-width', '0.1');
      exportSvg.appendChild(borePath);
    }

    // Serialize and download
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(exportSvg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `sprocket-${effectiveTeeth}t-${pitch.toFixed(2)}p.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate SVG viewBox
  const viewBoxSize = sprocketData.dimensions
    ? sprocketData.dimensions.outerDiameter + 10
    : 50;

  // Determine stroke color based on stepper compatibility
  const strokeColor = stepperMetrics.isCleanDivision ? '#22d3ee' : '#f97316';

  return (
    <div className="flex h-screen bg-[#0f1419] text-gray-100">
      {/* Sidebar Control Panel */}
      <aside className="w-80 bg-[#1a1f2e] border-r border-gray-700 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-cyan-400">Film Sprocket Generator</h1>
          <p className="text-xs text-gray-500 mt-1">Parametric Profile Designer</p>
        </div>

        {/* Units Toggle */}
        <div className="p-4 border-b border-gray-700">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Units
          </label>
          <div className="flex gap-2">
            {Object.entries(UNITS).map(([key, unitData]) => (
              <button
                key={key}
                onClick={() => setUnit(key)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  unit === key
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {unitData.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Film Presets */}
        <div className="p-4 border-b border-gray-700">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Film Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FILM_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors text-left"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Drive Parameters */}
        <div className="p-4 border-b border-gray-700">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Drive Parameters
          </label>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Number of Teeth (N)
              </label>
              <input
                type="number"
                min="3"
                max="200"
                value={numTeeth}
                onChange={(e) => setNumTeeth(parseInt(e.target.value) || 3)}
                disabled={useStepperOverride}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Film Pitch (P) [{UNITS[unit].symbol}]
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={displayValue(pitch)}
                onChange={(e) => setPitch(toMM(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Roller/Pin Diameter (Dr) [{UNITS[unit].symbol}]
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={displayValue(rollerDiameter)}
                onChange={(e) => setRollerDiameter(toMM(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Bore Diameter [{UNITS[unit].symbol}]
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={displayValue(boreDiameter)}
                onChange={(e) => setBoreDiameter(toMM(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Stepper Motor Calculator */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Stepper Motor Calculator
            </label>
            <button
              onClick={() => setUseStepperOverride(!useStepperOverride)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                useStepperOverride
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {useStepperOverride ? 'Active' : 'Enable'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Motor Steps/Rev
              </label>
              <input
                type="number"
                min="1"
                value={motorSteps}
                onChange={(e) => setMotorSteps(parseInt(e.target.value) || 200)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Microstepping
              </label>
              <select
                value={microstepping}
                onChange={(e) => setMicrostepping(parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              >
                {MICROSTEPPING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {useStepperOverride && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Target Frames/Rotation
                </label>
                <input
                  type="number"
                  min="3"
                  max="200"
                  value={targetFrames}
                  onChange={(e) => setTargetFrames(parseInt(e.target.value) || 3)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            {/* Stepper Status */}
            <div className={`p-3 rounded ${
              stepperMetrics.isCleanDivision ? 'bg-green-900/30 border border-green-700' : 'bg-orange-900/30 border border-orange-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  stepperMetrics.isCleanDivision ? 'bg-green-500' : 'bg-orange-500'
                }`} />
                <span className={`text-xs font-semibold ${
                  stepperMetrics.isCleanDivision ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {stepperMetrics.isCleanDivision ? 'CLEAN DIVISION' : 'UNEVEN DIVISION'}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Steps/Frame:</span>
                  <span className="font-mono text-white">{stepperMetrics.stepsPerFrame.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Steps:</span>
                  <span className="font-mono text-white">{stepperMetrics.totalSteps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-mono text-white">{stepperMetrics.accuracy.toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{stepperMetrics.recommendation}</p>
            </div>

            {/* Optimal frame suggestions */}
            {optimalFrames.length > 0 && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Optimal Frame Counts:
                </label>
                <div className="flex flex-wrap gap-1">
                  {optimalFrames.slice(0, 12).map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        if (useStepperOverride) {
                          setTargetFrames(count);
                        } else {
                          setNumTeeth(count);
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        count === effectiveTeeth
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calculated Dimensions */}
        {sprocketData.dimensions && (
          <div className="p-4 border-b border-gray-700">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Calculated Dimensions
            </label>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Pitch Diameter (PD):</span>
                <span className="font-mono text-cyan-400">
                  {displayValue(sprocketData.dimensions.pitchDiameter)} {UNITS[unit].symbol}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Outer Diameter (OD):</span>
                <span className="font-mono text-cyan-400">
                  {displayValue(sprocketData.dimensions.outerDiameter)} {UNITS[unit].symbol}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Root Diameter (RD):</span>
                <span className="font-mono text-cyan-400">
                  {displayValue(sprocketData.dimensions.rootDiameter)} {UNITS[unit].symbol}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="p-4 mt-auto">
          <button
            onClick={exportSVG}
            disabled={!sprocketData.path}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download SVG
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Export as laser-cutter ready SVG (1 unit = 1mm)
          </p>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a1f2e] border-b border-gray-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              <span className="text-cyan-400 font-semibold">{effectiveTeeth}</span> teeth
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-sm text-gray-400">
              <span className="text-cyan-400 font-semibold">{displayValue(pitch)}</span> {UNITS[unit].symbol} pitch
            </span>
            {sprocketData.dimensions && (
              <>
                <span className="text-gray-600">|</span>
                <span className="text-sm text-gray-400">
                  OD: <span className="text-cyan-400 font-semibold">
                    {displayValue(sprocketData.dimensions.outerDiameter)}
                  </span> {UNITS[unit].symbol}
                </span>
              </>
            )}
          </div>
          {!stepperMetrics.isCleanDivision && (
            <div className="flex items-center gap-2 text-orange-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Stepper division not clean
            </div>
          )}
        </header>

        {/* SVG Preview */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0f1419]">
          <div className="relative w-full h-full max-w-3xl max-h-3xl aspect-square">
            <svg
              ref={svgRef}
              viewBox={`${-viewBoxSize / 2} ${-viewBoxSize / 2} ${viewBoxSize} ${viewBoxSize}`}
              className="w-full h-full"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {/* Background */}
              <rect
                x={-viewBoxSize / 2}
                y={-viewBoxSize / 2}
                width={viewBoxSize}
                height={viewBoxSize}
                fill="#0a0e14"
              />

              {/* Grid */}
              <path
                d={generateGridPath(viewBoxSize, unit === 'mm' ? 5 : 5 * 25.4)}
                stroke="#1a2030"
                strokeWidth="0.1"
                fill="none"
              />
              <path
                d={generateGridPath(viewBoxSize, unit === 'mm' ? 1 : 25.4)}
                stroke="#141820"
                strokeWidth="0.05"
                fill="none"
              />

              {/* Center crosshair */}
              <line x1={-viewBoxSize / 2} y1="0" x2={viewBoxSize / 2} y2="0" stroke="#2a3040" strokeWidth="0.15" />
              <line x1="0" y1={-viewBoxSize / 2} x2="0" y2={viewBoxSize / 2} stroke="#2a3040" strokeWidth="0.15" />

              {/* Pitch circle reference */}
              {sprocketData.dimensions && (
                <circle
                  cx="0"
                  cy="0"
                  r={sprocketData.dimensions.pitchRadius}
                  fill="none"
                  stroke="#3b5998"
                  strokeWidth="0.1"
                  strokeDasharray="1 1"
                  opacity="0.5"
                />
              )}

              {/* Sprocket profile */}
              {sprocketData.path && (
                <path
                  d={sprocketData.path}
                  fill="#1e2738"
                  stroke={strokeColor}
                  strokeWidth="0.3"
                  strokeLinejoin="round"
                />
              )}

              {/* Bore hole */}
              {sprocketData.borePath && (
                <path
                  d={sprocketData.borePath}
                  fill="#0a0e14"
                  stroke={strokeColor}
                  strokeWidth="0.2"
                />
              )}

              {/* Scale indicator */}
              <g transform={`translate(${-viewBoxSize / 2 + 3}, ${viewBoxSize / 2 - 3})`}>
                <line x1="0" y1="0" x2="10" y2="0" stroke="#666" strokeWidth="0.3" />
                <line x1="0" y1="-1" x2="0" y2="1" stroke="#666" strokeWidth="0.3" />
                <line x1="10" y1="-1" x2="10" y2="1" stroke="#666" strokeWidth="0.3" />
                <text x="5" y="-1.5" textAnchor="middle" fill="#666" fontSize="2">10mm</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#1a1f2e] border-t border-gray-700 px-6 py-2 text-xs text-gray-500 flex justify-between">
          <span>Film Sprocket Generator v1.0</span>
          <span>All dimensions in {UNITS[unit].name}</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
