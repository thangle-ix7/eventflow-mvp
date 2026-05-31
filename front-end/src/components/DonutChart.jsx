
// Pure SVG Donut Chart - no external library needed
const DonutChart = ({ percentage, size = 160, strokeWidth = 14 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 80) return '#22c55e'; // green-500
    if (pct >= 50) return '#3b82f6'; // blue-500
    if (pct >= 25) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const color = getColor(percentage);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-gray-900">{percentage}%</span>
        <span className="text-xs text-gray-500 font-medium mt-0.5">Tiến độ</span>
      </div>
    </div>
  );
};

export default DonutChart;
