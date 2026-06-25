import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children, onClick, type = "button", disabled, loading,
  variant = "primary", className = "", size = "md"
}) => {
  const variants = {
    primary: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    success: "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs rounded-xl gap-1.5",
    md: "px-6 py-3.5 text-sm rounded-2xl gap-2",
    lg: "px-8 py-4 text-base rounded-[1.25rem] gap-2.5"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`interactive-button flex items-center justify-center font-bold tracking-tight shadow-md ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} /> : children}
    </button>
  );
};
