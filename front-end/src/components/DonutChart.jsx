// Pure SVG Donut Chart - no external library needed
const DonutChart = ({ percentage, size = 160, strokeWidth = 14 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 80) return '#22c55e'; // green-500
    if (pct >= 50) return '#0ea5e9'; // sky-500
    if (pct >= 25) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const color = getColor(percentage);
  const gradientId = `donut-gradient-${Math.round(percentage)}-${size}-${strokeWidth}`;
  const glowId = `donut-glow-${Math.round(percentage)}-${size}-${strokeWidth}`;

  return (
    <div className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-3 shadow-xl shadow-sky-100/70">
      <div className="absolute inset-2 rounded-full border border-sky-100/80 bg-white/70 backdrop-blur" />

      <svg
        width={size}
        height={size}
        className="relative -rotate-90 drop-shadow-sm"
        role="img"
        aria-label={`Tiến độ ${percentage}%`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>

          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0f2fe"
          strokeWidth={strokeWidth}
        />

        {/* Soft inner track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth / 2 - 2}
          fill="none"
          stroke="#f0fdf4"
          strokeWidth="2"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percentage >= 50 ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={percentage >= 50 ? `url(#${glowId})` : undefined}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="bg-gradient-to-r from-slate-950 via-sky-700 to-emerald-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          {percentage}%
        </span>
        <span className="mt-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-sky-600">
          Tiến độ
        </span>
      </div>
    </div>
  );
};

export default DonutChart;