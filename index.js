import React, { useState, useRef, useEffect } from 'react';
import { Zap, Power, RotateCcw, Info, Plus } from 'lucide-react';

const CircuitSimulator = () => {
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isPowered, setIsPowered] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [measurements, setMeasurements] = useState({ voltage: 0, current: 0, power: 0 });
  const canvasRef = useRef(null);
  const [draggedComponent, setDraggedComponent] = useState(null);

  const componentTypes = [
    { type: 'battery', label: 'Battery', icon: '🔋', voltage: 9, color: '#10b981' },
    { type: 'resistor', label: 'Resistor', icon: '📊', resistance: 100, color: '#f59e0b' },
    { type: 'led', label: 'LED', icon: '💡', resistance: 10, color: '#ef4444' },
    { type: 'switch', label: 'Switch', icon: '🔘', isClosed: true, color: '#8b5cf6' }
  ];

  const addComponent = (type) => {
    const newComponent = {
      id: Date.now(),
      type: type.type,
      x: 150 + components.length * 80,
      y: 200,
      ...type
    };
    setComponents([...components, newComponent]);
  };

  const calculateCircuit = () => {
    if (components.length === 0) return;

    // Simple series circuit calculation
    const battery = components.find(c => c.type === 'battery');
    const resistors = components.filter(c => c.type === 'resistor' || c.type === 'led');
    const switches = components.filter(c => c.type === 'switch');

    if (!battery) return;

    // Check if all switches are closed
    const allSwitchesClosed = switches.every(s => s.isClosed);
    
    if (!allSwitchesClosed || resistors.length === 0) {
      setMeasurements({ voltage: 0, current: 0, power: 0 });
      return;
    }

    // Calculate total resistance
    const totalResistance = resistors.reduce((sum, r) => sum + r.resistance, 0);
    
    // Ohm's Law: I = V / R
    const current = battery.voltage / totalResistance;
    
    // Power: P = V * I
    const power = battery.voltage * current;

    setMeasurements({
      voltage: battery.voltage.toFixed(2),
      current: (current * 1000).toFixed(2), // Convert to mA
      power: power.toFixed(2)
    });
  };

  useEffect(() => {
    if (isPowered) {
      calculateCircuit();
      const interval = setInterval(calculateCircuit, 100);
      return () => clearInterval(interval);
    } else {
      setMeasurements({ voltage: 0, current: 0, power: 0 });
    }
  }, [isPowered, components]);

  useEffect(() => {
    drawCircuit();
  }, [components, isPowered, measurements]);

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw connections between components
    if (components.length > 1) {
      ctx.strokeStyle = isPowered && measurements.current > 0 ? '#3b82f6' : '#9ca3af';
      ctx.lineWidth = 3;
      for (let i = 0; i < components.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(components[i].x + 30, components[i].y + 30);
        ctx.lineTo(components[i + 1].x + 30, components[i + 1].y + 30);
        ctx.stroke();

        // Draw current flow animation
        if (isPowered && measurements.current > 0) {
          const progress = (Date.now() % 1000) / 1000;
          const x = components[i].x + 30 + (components[i + 1].x - components[i].x) * progress;
          const y = components[i].y + 30 + (components[i + 1].y - components[i].y) * progress;
          
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Close the circuit
      if (components.length > 2) {
        ctx.beginPath();
        ctx.moveTo(components[components.length - 1].x + 30, components[components.length - 1].y + 30);
        ctx.lineTo(components[0].x + 30, components[0].y + 30);
        ctx.stroke();
      }
    }

    // Draw components
    components.forEach(comp => {
      ctx.fillStyle = comp.color;
      ctx.fillRect(comp.x, comp.y, 60, 60);
      ctx.strokeStyle = selectedComponent?.id === comp.id ? '#2563eb' : '#1f2937';
      ctx.lineWidth = selectedComponent?.id === comp.id ? 3 : 2;
      ctx.strokeRect(comp.x, comp.y, 60, 60);

      // Draw icon
      ctx.font = '30px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comp.icon, comp.x + 30, comp.y + 30);

      // Draw label
      ctx.font = '12px Arial';
      ctx.fillStyle = '#1f2937';
      ctx.fillText(comp.label, comp.x + 30, comp.y + 75);

      // Draw LED glow effect when powered
      if (comp.type === 'led' && isPowered && measurements.current > 0) {
        const brightness = Math.min(measurements.current / 50, 1);
        ctx.shadowBlur = 20 * brightness;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = `rgba(251, 191, 36, ${brightness})`;
        ctx.beginPath();
        ctx.arc(comp.x + 30, comp.y + 30, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = components.find(c => 
      x >= c.x && x <= c.x + 60 && y >= c.y && y <= c.y + 60
    );

    setSelectedComponent(clicked || null);
  };

  const deleteComponent = () => {
    if (selectedComponent) {
      setComponents(components.filter(c => c.id !== selectedComponent.id));
      setSelectedComponent(null);
    }
  };

  const updateComponentValue = (property, value) => {
    if (selectedComponent) {
      setComponents(components.map(c => 
        c.id === selectedComponent.id 
          ? { ...c, [property]: parseFloat(value) || value }
          : c
      ));
      setSelectedComponent({ ...selectedComponent, [property]: parseFloat(value) || value });
    }
  };

  const toggleSwitch = () => {
    if (selectedComponent && selectedComponent.type === 'switch') {
      const newValue = !selectedComponent.isClosed;
      updateComponentValue('isClosed', newValue);
    }
  };

  const resetCircuit = () => {
    setComponents([]);
    setConnections([]);
    setIsPowered(false);
    setSelectedComponent(null);
    setMeasurements({ voltage: 0, current: 0, power: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Zap className="text-yellow-500" size={36} />
                CircuitSim - Interactive Circuit Builder
              </h1>
              <p className="text-gray-600 mt-2">Learn Ohm's Law through hands-on experimentation</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPowered(!isPowered)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  isPowered 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
              >
                <Power size={20} />
                {isPowered ? 'Power ON' : 'Power OFF'}
              </button>
              <button
                onClick={resetCircuit}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
              >
                <RotateCcw size={20} />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Component Library */}
          <div className="col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus size={24} />
              Components
            </h2>
            <div className="space-y-3">
              {componentTypes.map(comp => (
                <button
                  key={comp.type}
                  onClick={() => addComponent(comp)}
                  className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border-2 border-blue-200 transition-all flex items-center gap-3"
                >
                  <span className="text-3xl">{comp.icon}</span>
                  <span className="font-semibold text-gray-700">{comp.label}</span>
                </button>
              ))}
            </div>

            {/* Component Properties */}
            {selectedComponent && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-gray-800 mb-3">Selected: {selectedComponent.label}</h3>
                
                {selectedComponent.type === 'battery' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Voltage (V)
                    </label>
                    <input
                      type="number"
                      value={selectedComponent.voltage}
                      onChange={(e) => updateComponentValue('voltage', e.target.value)}
                      className="w-full p-2 border rounded"
                      min="1"
                      max="24"
                    />
                  </div>
                )}

                {(selectedComponent.type === 'resistor' || selectedComponent.type === 'led') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Resistance (Ω)
                    </label>
                    <input
                      type="number"
                      value={selectedComponent.resistance}
                      onChange={(e) => updateComponentValue('resistance', e.target.value)}
                      className="w-full p-2 border rounded"
                      min="1"
                      max="10000"
                    />
                  </div>
                )}

                {selectedComponent.type === 'switch' && (
                  <button
                    onClick={toggleSwitch}
                    className={`w-full p-2 rounded font-semibold ${
                      selectedComponent.isClosed 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {selectedComponent.isClosed ? 'CLOSED' : 'OPEN'}
                  </button>
                )}

                <button
                  onClick={deleteComponent}
                  className="w-full mt-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
                >
                  Delete Component
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <div className="flex items-start gap-2">
                <Info size={20} className="text-yellow-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-2">How to use:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Add components from the library</li>
                    <li>Click components to select and modify</li>
                    <li>Arrange them in sequence</li>
                    <li>Click "Power ON" to see results</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Circuit Workspace</h2>
            <canvas
              ref={canvasRef}
              width={600}
              height={500}
              onClick={handleCanvasClick}
              className="border-2 border-gray-300 rounded-lg cursor-pointer bg-white"
            />
          </div>

          {/* Measurements */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Measurements</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <p className="text-sm font-semibold text-gray-600">Voltage</p>
                  <p className="text-3xl font-bold text-green-600">{measurements.voltage} V</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm font-semibold text-gray-600">Current</p>
                  <p className="text-3xl font-bold text-blue-600">{measurements.current} mA</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <p className="text-sm font-semibold text-gray-600">Power</p>
                  <p className="text-3xl font-bold text-purple-600">{measurements.power} W</p>
                </div>
              </div>
            </div>

            {/* Formulas */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Ohm's Law</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-mono font-bold text-lg">V = I × R</p>
                  <p className="text-gray-600 mt-1">Voltage = Current × Resistance</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-mono font-bold text-lg">P = V × I</p>
                  <p className="text-gray-600 mt-1">Power = Voltage × Current</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-mono font-bold text-lg">I = V / R</p>
                  <p className="text-gray-600 mt-1">Current = Voltage / Resistance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitSimulator;
