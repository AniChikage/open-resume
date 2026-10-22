import { useLayoutEffect, useRef, useState } from 'react';
import type { EditorDocument } from '../types.ts';
import { ResumePreview } from './ResumePreview.tsx';

export function ResponsiveResumePreview({ resume, settings }: EditorDocument) {
  const container = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState({ scale: 1, height: 1123 });
  useLayoutEffect(() => {
    const update = () => {
      if (!container.current || !paper.current) return;
      const scale = Math.min(1, container.current.clientWidth / 794);
      const height = Math.ceil(paper.current.offsetHeight * scale);
      setLayout(current => current.scale === scale && current.height === height ? current : { scale, height });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container.current!);
    observer.observe(paper.current!);
    update();
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="mx-auto w-full min-w-0 max-w-[794px]">
    <div className="relative overflow-hidden" style={{ height: layout.height }}>
      <div style={{ width: 794, transform: `scale(${layout.scale})`, transformOrigin: 'top left' }}>
        <ResumePreview resume={resume} settings={settings} refNode={paper} paperStyle={{ width: 794, boxShadow: 'none' }} />
      </div>
    </div>
  </div>;
}
