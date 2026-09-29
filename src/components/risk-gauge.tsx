"use client";

import { motion } from "framer-motion";
import { RISK_META } from "@/lib/api-client";
import type { RiskLevel } from "@/lib/types";

interface Props {
  score: number;
  level: RiskLevel;
  size?: number;
}

/**
 * Semi-circular radial risk gauge (speedometer style).
 * Glanceable — the rider can read risk in <1s.
 */
export default function RiskGauge({ score, level, size = 180 }: Props) {
  const meta = RISK_META[level];
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Semi-circle: from 180° (left) to 360°/0° (right), so 180° sweep.
  const circumference = Math.PI * r; // half circle
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - pct);

  // Tick marks every 10 units
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size * 0.62 }}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${level}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={describeArc(cx, cy, r, 180, 360)}
          fill="none"
          stroke="currentColor"
          strokeWidth={10}
          strokeLinecap="round"
          className="text-muted/40"
        />
        {/* Filled progress */}
        <motion.path
          d={describeArc(cx, cy, r, 180, 360)}
          fill="none"
          stroke={`url(#grad-${level})`}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Ticks */}
        {ticks.map((t) => {
          const angle = 180 + (t / 100) * 180;
          const p1 = polar(cx, cy, r - 8, angle);
          const p2 = polar(cx, cy, r - 14, angle);
          return (
            <line
              key={t}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="currentColor"
              strokeWidth={t % 50 === 0 ? 2 : 1}
              className="text-muted-foreground/40"
            />
          );
        })}
        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={polar(cx, cy, r - 16, 180 + pct * 180).x}
          y2={polar(cx, cy, r - 16, 180 + pct * 180).y}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          className={meta.color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        />
        <circle cx={cx} cy={cy} r={5} className="fill-foreground" />
      </svg>

      <div className="absolute -bottom-1 flex flex-col items-center">
        <motion.div
          key={score}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`text-3xl font-bold tabular-nums leading-none ${meta.color}`}
        >
          {score}
        </motion.div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 0) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
