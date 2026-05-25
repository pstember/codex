import { useId } from "react";

type CodexGenerationAnimationProps = {
  label: string;
  detail?: string;
  tone?: "light" | "dark";
};

const toneClassNames = {
  light: {
    shell: "border-[#d7e0f4] bg-[#f8fbff] text-[#14213d]",
    label: "text-[#0b1020]",
    detail: "text-[#5b6883]",
    grid: "#d7e0f4",
    primary: "#2563eb",
    accent: "#22d3ee",
    warm: "#d7ff3f",
  },
  dark: {
    shell: "border-white/10 bg-white/5 text-white",
    label: "text-white",
    detail: "text-[#c7d2fe]",
    grid: "rgba(255,255,255,0.18)",
    primary: "#67e8f9",
    accent: "#d7ff3f",
    warm: "#ffb020",
  },
};

export function CodexGenerationAnimation({
  detail = "Codex is validating context, evidence, and generated output.",
  label,
  tone = "light",
}: CodexGenerationAnimationProps) {
  const palette = toneClassNames[tone];
  const beamId = `codex-generation-beam-${tone}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div
      aria-label={label}
      className={`grid min-w-0 gap-3 rounded-md border p-4 ${palette.shell}`}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-4">
        <svg
          aria-hidden="true"
          className="size-20 shrink-0"
          focusable="false"
          viewBox="0 0 120 120"
        >
          <defs>
            <linearGradient id={beamId} x1="20" x2="100" y1="20" y2="100">
              <stop offset="0" stopColor={palette.primary} />
              <stop offset="0.55" stopColor={palette.accent} />
              <stop offset="1" stopColor={palette.warm} />
            </linearGradient>
          </defs>
          <rect
            fill="none"
            height="74"
            rx="10"
            stroke={palette.grid}
            strokeWidth="3"
            width="74"
            x="23"
            y="23"
          />
          <g stroke={palette.grid} strokeLinecap="round" strokeWidth="2">
            <path d="M38 42h44" />
            <path d="M38 60h44" />
            <path d="M38 78h44" />
            <path d="M42 38v44" />
            <path d="M60 38v44" />
            <path d="M78 38v44" />
          </g>
          <g>
            <animateTransform
              attributeName="transform"
              dur="3.2s"
              repeatCount="indefinite"
              type="rotate"
              values="0 60 60;360 60 60"
            />
            <circle cx="60" cy="14" fill={`url(#${beamId})`} r="7" />
            <circle cx="95" cy="60" fill={palette.accent} opacity="0.72" r="4">
              <animate
                attributeName="opacity"
                dur="1.6s"
                repeatCount="indefinite"
                values="0.35;0.9;0.35"
              />
            </circle>
            <circle cx="60" cy="106" fill={palette.primary} opacity="0.64" r="5">
              <animate
                attributeName="opacity"
                begin="0.35s"
                dur="1.6s"
                repeatCount="indefinite"
                values="0.25;0.85;0.25"
              />
            </circle>
          </g>
          <path
            d="M35 83c9-19 19-28 31-28 7 0 12 3 19 9"
            fill="none"
            stroke={`url(#${beamId})`}
            strokeLinecap="round"
            strokeWidth="5"
          >
            <animate
              attributeName="stroke-dasharray"
              dur="2.4s"
              repeatCount="indefinite"
              values="4 70;42 32;4 70"
            />
          </path>
        </svg>
        <div className="min-w-0">
          <p className={`text-sm font-black ${palette.label}`}>{label}</p>
          <p className={`mt-1 text-sm leading-6 ${palette.detail}`}>{detail}</p>
        </div>
      </div>
    </div>
  );
}
