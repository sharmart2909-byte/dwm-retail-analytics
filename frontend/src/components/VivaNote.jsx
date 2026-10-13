import React from 'react';
import { BookOpen } from 'lucide-react';

export default function VivaNote({ title = "DWM Viva Quick Defense Point", children }) {
  return (
    <div className="viva-box">
      <div className="viva-box-title">
        <BookOpen size={16} />
        <span>{title}</span>
      </div>
      <div className="viva-box-content">
        {children}
      </div>
    </div>
  );
}
