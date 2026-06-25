import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  label: string;
  value: number;
  maxValue: number;
  icon: LucideIcon;
  visible: boolean;
}

const colorMap: Record<string, { text: string; bar: string }> = {
  emerald: { text: 'text-emerald-500', bar: 'bg-emerald-400' },
  amber: { text: 'text-amber-500', bar: 'bg-amber-400' },
  rose: { text: 'text-rose-500', bar: 'bg-rose-400' },
};

export default function ScoreCard({ label, value, maxValue, icon: Icon, visible }: ScoreCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.round((value / maxValue) * 100);

  useEffect(() => {
    if (!visible) return;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [visible, value]);

  const colorKey = percentage >= 70 ? 'emerald' : percentage >= 40 ? 'amber' : 'rose';
  const colors = colorMap[colorKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-100 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className={colors.text} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-slate-800">{displayValue}</span>
        <span className="text-xs text-slate-400">/ {maxValue}</span>
      </div>
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={visible ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
