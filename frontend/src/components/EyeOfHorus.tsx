interface EyeOfHorusProps {
  className?: string
  stroke?: string
  strokeWidth?: number | string
}

export default function EyeOfHorus({
  className = 'w-6 h-6',
  stroke = '#9E7111',
  strokeWidth = 2
}: EyeOfHorusProps) {
  return (
    <svg
      className={`brand-eye-horus ${className}`}
      viewBox="0 0 100 80"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Upper stylized eyebrow */}
      <path d="M 12,24 C 28,14 72,14 88,24" />
      {/* Eye contour */}
      <path d="M 14,38 C 30,22 70,22 86,38 C 70,54 30,54 14,38 Z" />
      {/* Iris / Pupil circle */}
      <circle cx="50" cy="38" r={7} strokeWidth={strokeWidth} />
      {/* Vertical tear/falcon mark */}
      <path d="M 32,46 L 24,66 L 36,58 L 36,46" />
      {/* Lower spiral flourish */}
      <path d="M 50,46 C 50,68 76,76 80,60 C 82,50 72,48 68,54 C 64,60 70,68 76,66" />
    </svg>
  )
}
