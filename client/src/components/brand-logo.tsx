interface BrandLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

export function BrandLogo({ className = "", size = "md" }: BrandLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl", 
    lg: "text-2xl",
    xl: "text-3xl"
  }

  return (
    <div className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-foreground">n</span>
      <span style={{ color: '#00ADE0' }}>.</span>
      <span className="text-foreground">PIIdetector</span>
    </div>
  )
}