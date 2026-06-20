// HeavyChart.js - Heavy component yang di-lazy load
import React, { useEffect, useRef } from 'react';

// Simulasi heavy chart library (misal Chart.js)
// Dalam real app, ini bisa import chart.js yang 200KB+
export default function HeavyChart() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Simulasi chart rendering
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Simple bar chart simulation
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(50, 50, 100, 200);
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(200, 80, 100, 170);
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(350, 120, 100, 130);
    
    console.log('📊 Heavy chart loaded and rendered');
  }, []);

  return (
    <div className="heavy-chart">
      <h3>Sales Chart (Heavy Component)</h3>
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={300}
        style={{ border: '1px solid #ddd' }}
      />
      <p className="chart-note">
        💡 This chart component is code-split and loaded on-demand
      </p>
    </div>
  );
}

// Export named untuk testing
export { HeavyChart };
