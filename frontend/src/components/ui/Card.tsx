import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", hoverable = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={hoverable ? { y: -4, shadow: "0 12px 40px rgba(0,0,0,0.08)" } : {}}
    className={`glass-card rounded-[2.5rem] p-8 transition-shadow duration-300 ${className}`}
  >
    {children}
  </motion.div>
);
