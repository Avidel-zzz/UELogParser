//! 可调整大小的面板组件

import { useState, useCallback, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  initialLeftWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  direction?: 'horizontal' | 'vertical';
}

export function ResizablePanel({
  leftPanel,
  rightPanel,
  initialLeftWidth = 256,
  minWidth = 150,
  maxWidth = 500,
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;

    setLeftWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
  }, [isDragging, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <div style={{ width: leftWidth, flexShrink: 0 }} className="overflow-hidden">
        {leftPanel}
      </div>

      {/* Resize Handle */}
      <div
        className={`
          w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize
          flex-shrink-0 transition-colors duration-150
          ${isDragging ? 'bg-blue-500' : ''}
        `}
        onMouseDown={handleMouseDown}
      />

      <div className="flex-1 overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}
