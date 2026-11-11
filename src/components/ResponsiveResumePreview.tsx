import { useLayoutEffect, useRef, useState } from 'react';
import type { EditorDocument } from '../types.ts';
import { ResumePreview } from './ResumePreview.tsx';
import { getPaperSize } from '../lib/paper.ts';

export function ResponsiveResumePreview({ resume, settings }: EditorDocument) {
  const width = getPaperSize(settings.paperSize).widthMm * 96 / 25.4;
  const container = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState({ scale: 1, height: 1123 });
  useLayoutEffect(() => {
    const update = () => {
      if (!container.current || !paper.current) return;
      const scale = Math.min(1, container.current.clientWidth / width);
      const height = Math.ceil(paper.current.offsetHeight * scale);
      setLayout(current => current.scale === scale && current.height === height ? current : { scale, height });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container.current!);
    observer.observe(paper.current!);
    update();
    return () => observer.disconnect();
  }, [width]);
  return <div ref={container} className="mx-auto w-full min-w-0" style={{ maxWidth: width }}>
    <div className="relative overflow-hidden" style={{ height: layout.height }}>
      <div style={{ width, transform: `scale(${layout.scale})`, transformOrigin: 'top left' }}>
        <ResumePreview resume={resume} settings={settings} refNode={paper} paperStyle={{ width, boxShadow: 'none' }} />
      </div>
    </div>
  </div>;
}
