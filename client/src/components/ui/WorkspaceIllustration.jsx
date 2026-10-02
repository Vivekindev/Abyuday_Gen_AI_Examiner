// Decorative artwork; the homepage's text describes the real product features.
export default function WorkspaceIllustration() {
  return (
    <div className="workspace-illustration" aria-hidden="true">
      <svg viewBox="0 0 420 370" fill="none" focusable="false">
        <circle cx="226" cy="172" r="143" className="illustration-halo" />
        <path
          d="M60 241c-29-82 27-174 111-184M296 303c44-17 78-55 88-103"
          className="illustration-orbit"
          strokeWidth="1.5"
          strokeDasharray="4 7"
        />
        <circle cx="322" cy="77" r="32" className="illustration-sun" />
        <path
          d="M319 25v-8m40 27 6-6m8 41h9"
          className="illustration-sun-stroke"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="rotate(-9 185 187)">
          <rect
            x="91"
            y="75"
            width="215"
            height="260"
            rx="18"
            className="illustration-back"
          />
        </g>
        <rect
          x="98"
          y="57"
          width="218"
          height="264"
          rx="18"
          className="illustration-paper"
        />
        <rect x="119" y="79" width="32" height="32" rx="9" fill="#244cc4" />
        <path
          d="m127 102 8-16 8 16m-13-5h10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M165 91h73m-73 13h44"
          className="illustration-line"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="M120 133h173" className="illustration-rule" />
        {[164, 205, 246].map((y, index) => (
          <g key={y}>
            <rect
              x="120"
              y={y - 8}
              width="18"
              height="18"
              rx="5"
              className={
                index === 2 ? "illustration-empty" : "illustration-check-bg"
              }
            />
            {index < 2 && (
              <path
                d={`m125 ${y + 1} 3 3 5-6`}
                className="illustration-check"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <path
              d={`M153 ${y + 1}h${[124, 94, 108][index]}`}
              className="illustration-line"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        ))}
        <rect
          x="120"
          y="279"
          width="173"
          height="6"
          rx="3"
          className="illustration-track"
        />
        <rect x="120" y="279" width="112" height="6" rx="3" fill="#597cdf" />
        <g transform="rotate(6 323 259)">
          <rect
            x="273"
            y="213"
            width="98"
            height="94"
            rx="19"
            className="illustration-paper"
          />
          <path
            d="m292 266 19-17 13 8 26-25"
            className="illustration-check"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M338 232h12v12"
            className="illustration-check"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M291 283h59"
            className="illustration-rule"
            strokeLinecap="round"
          />
        </g>
        <circle cx="64" cy="268" r="6" className="illustration-sun" />
        <circle cx="347" cy="164" r="4" fill="#8ba1e2" />
      </svg>
    </div>
  );
}
