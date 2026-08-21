interface BrandIconProps {
  className?: string
}

export default function BrandIcon({ className = 'w-6 h-6' }: BrandIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7" fill="#b8860b" />
      {/* Left policy document column */}
      <path d="M8 8h6v16H8V8z" fill="#ffffff" fillOpacity="0.95" />
      {/* Right secondary policy column */}
      <path d="M18 8h6v10h-6V8z" fill="#ffffff" fillOpacity="0.95" />
      {/* Bottom right AI lens / smart node */}
      <circle cx="21" cy="24" r="3" fill="#ffffff" fillOpacity="0.85" />
    </svg>
  )
}
