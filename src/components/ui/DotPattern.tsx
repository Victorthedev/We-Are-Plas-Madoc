export default function DotPattern({ opacity = 0.08, className = "" }: { opacity?: number; className?: string }) {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ opacity }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="wapm-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="3" fill="#8E44AD" />
              <circle cx="40" cy="15" r="2.5" fill="#5DADE2" />
              <circle cx="25" cy="40" r="2" fill="#E91E8C" />
              <circle cx="50" cy="45" r="3" fill="#6C3483" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wapm-dots)" />
        </svg>
      </div>
    );
  }
  