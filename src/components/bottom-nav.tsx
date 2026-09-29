"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Radio, ShieldCheck as StopsIcon, Siren, BarChart3, History, Trophy, Award } from "lucide-react";

interface TabDef {
  value: string;
  icon: React.ReactNode;
  label: string;
}

const TABS: TabDef[] = [
  { value: "feed", icon: <Radio className="h-4 w-4" />, label: "Feed" },
  { value: "stops", icon: <StopsIcon className="h-4 w-4" />, label: "Stops" },
  { value: "report", icon: <Siren className="h-4 w-4" />, label: "Report" },
  { value: "stats", icon: <BarChart3 className="h-4 w-4" />, label: "Stats" },
  { value: "history", icon: <History className="h-4 w-4" />, label: "Trips" },
  { value: "board", icon: <Trophy className="h-4 w-4" />, label: "Top" },
  { value: "badges", icon: <Award className="h-4 w-4" />, label: "Badges" },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * Mobile bottom navigation bar — visible only on small screens (lg:hidden).
 * Provides quick tab switching with a thumb-friendly bottom bar.
 */
export default function BottomNav({ activeTab, onTabChange }: Props) {
  // Show 5 tabs on mobile (feed, stops, report, stats, more)
  const mobileTabs = TABS.slice(0, 5);
  const activeIndex = mobileTabs.findIndex((t) => t.value === activeTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[600] border-t bg-background/95 backdrop-blur-lg lg:hidden">
      <div className="flex items-center justify-around px-1 py-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
        {mobileTabs.map((tab, i) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-md transition ${isActive ? "bg-primary/10" : ""}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-px h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
