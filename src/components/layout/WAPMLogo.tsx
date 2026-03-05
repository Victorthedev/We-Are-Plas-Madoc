interface Props {
    size?: number;
    white?: boolean;
  }
  
  export default function WAPMLogo({ size = 40, white = false }: Props) {
    const colors = white
      ? ["#ffffff", "#ffffff", "#ffffff", "#ffffff"]
      : ["#8E44AD", "#E91E8C", "#5DADE2", "#6C3483"];
  
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="WAPM umbrella logo">
        <circle cx="50" cy="15" r="6" fill={colors[0]} />
        <circle cx="35" cy="25" r="5" fill={colors[1]} />
        <circle cx="50" cy="25" r="5" fill={colors[2]} />
        <circle cx="65" cy="25" r="5" fill={colors[3]} />
        <circle cx="22" cy="35" r="5" fill={colors[0]} />
        <circle cx="36" cy="35" r="5" fill={colors[1]} />
        <circle cx="50" cy="35" r="5" fill={colors[2]} />
        <circle cx="64" cy="35" r="5" fill={colors[3]} />
        <circle cx="78" cy="35" r="5" fill={colors[0]} />
        <circle cx="15" cy="45" r="4" fill={colors[1]} />
        <circle cx="29" cy="45" r="4" fill={colors[2]} />
        <circle cx="43" cy="45" r="4" fill={colors[3]} />
        <circle cx="57" cy="45" r="4" fill={colors[0]} />
        <circle cx="71" cy="45" r="4" fill={colors[1]} />
        <circle cx="85" cy="45" r="4" fill={colors[2]} />
        <rect x="48" y="48" width="4" height="35" rx="2" fill={white ? "#ffffff" : "#2D1B4E"} />
        <path d="M52 83 Q52 92 44 92 Q36 92 36 85" stroke={white ? "#ffffff" : "#2D1B4E"} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  