import type { SVGProps } from "react";

export type GameIconName =
  | "business"
  | "credits"
  | "pending-revenue"
  | "income"
  | "reputation"
  | "manager"
  | "upgrade"
  | "locked"
  | "objectives"
  | "log"
  | "dev"
  | "collect";

interface GameIconProps extends SVGProps<SVGSVGElement> {
  name: GameIconName;
}

export function GameIcon({ className, name, ...props }: GameIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ? `game-icon ${className}` : "game-icon"}
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      {iconPath(name)}
    </svg>
  );
}

function iconPath(name: GameIconName) {
  switch (name) {
    case "credits":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M14.5 8.7a4 4 0 1 0 0 6.6" />
        </>
      );
    case "pending-revenue":
      return (
        <>
          <path d="M5 9h14v9H5z" />
          <path d="M8 9V6h8v3" />
          <path d="M8 14h8" />
        </>
      );
    case "income":
      return (
        <>
          <path d="M4 17h16" />
          <path d="M6 15l4-4 3 3 5-7" />
          <path d="M15 7h3v3" />
        </>
      );
    case "reputation":
      return (
        <>
          <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 19l.9-5.4-3.9-3.8 5.4-.8z" />
        </>
      );
    case "manager":
      return (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M17 8h3" />
        </>
      );
    case "upgrade":
      return (
        <>
          <path d="M12 19V5" />
          <path d="M6 11l6-6 6 6" />
          <path d="M5 20h14" />
        </>
      );
    case "locked":
      return (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "objectives":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 8v4l3 2" />
        </>
      );
    case "log":
      return (
        <>
          <path d="M7 5h10" />
          <path d="M7 10h10" />
          <path d="M7 15h7" />
          <path d="M5 3h14v18H5z" />
        </>
      );
    case "dev":
      return (
        <>
          <path d="M8 9l-4 3 4 3" />
          <path d="M16 9l4 3-4 3" />
          <path d="M14 5l-4 14" />
        </>
      );
    case "collect":
      return (
        <>
          <path d="M5 10h14v8H5z" />
          <path d="M8 10V7h8v3" />
          <path d="M12 13v3" />
          <path d="M10 15h4" />
        </>
      );
    case "business":
    default:
      return (
        <>
          <path d="M5 20V8l7-4 7 4v12" />
          <path d="M9 20v-6h6v6" />
          <path d="M8 10h2" />
          <path d="M14 10h2" />
        </>
      );
  }
}
