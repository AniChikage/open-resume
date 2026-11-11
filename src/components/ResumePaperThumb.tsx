import { memo, useEffect, useRef, useState } from 'react';
import { getPaperSize } from '../lib/paper.ts';
import type { EditorDocument } from '../types.ts';
import { ResumePreview } from './ResumePreview.tsx';

/** A paper thumbnail, with chrome kept outside the actual resume layout. */
function ResumePaperThumb({ resume, settings }: EditorDocument) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);
  const paper = getPaperSize(settings.paperSize);
  const width = paper.widthMm * 96 / 25.4;
  const height = paper.heightMm * 96 / 25.4;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.inert = true;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { rootMargin: '0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node || !visible) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / width, entry.contentRect.height / height));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, width, height]);
  return <div ref={ref} className="document-thumb" aria-hidden="true">
    {visible && scale > 0 && <div className="document-thumb-paper" style={{ width: width * scale, height: height * scale }}>
      <div style={{ width, height, transform: 'scale(' + scale + ')', transformOrigin: 'top left' }}>
        <ResumePreview resume={resume} settings={settings} profileHeading="p" paperStyle={{ width, minHeight: height, boxShadow: 'none', borderRadius: 0 }} />
      </div>
    </div>}
  </div>;
}
export default memo(ResumePaperThumb);
