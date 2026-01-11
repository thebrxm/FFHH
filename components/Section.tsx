
import React from 'react';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerColor?: string;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, className = "", headerColor = "border-blue-600" }) => {
  return (
    <div className={`glass-card rounded-[32px] p-8 transition-all duration-500 hover:translate-y-[-4px] flex flex-col ${className}`}>
      <div className={`flex items-center gap-5 mb-8 pb-5 border-b-2 ${headerColor} transition-colors duration-500`}>
        <div className="p-3.5 bg-slate-900 dark:bg-slate-800 text-white dark:text-blue-400 rounded-2xl shadow-lg ring-1 ring-slate-800 dark:ring-slate-700">
          {icon}
        </div>
        <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="space-y-6 flex-1">
        {children}
      </div>
    </div>
  );
};

export default Section;
