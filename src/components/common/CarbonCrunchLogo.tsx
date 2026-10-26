'use client';

interface CarbonCrunchLogoProps {
  size?: number;
  className?: string;
}

export default function CarbonCrunchLogo({
  size = 96,
  className = '',
}: CarbonCrunchLogoProps) {
  return (
    <img
      src="/carbon-crunch-logo.png"
      alt="Carbon Crunch Logo"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}
