import { useState } from 'react';
import type { EditorDocument } from '../types.ts';
import { generateShareUrl } from '../lib/share.ts';
import { useTheme } from '../lib/theme.tsx';
import { errorMessage } from '../lib/validation.ts';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';

export function ShareResumeDialog({ resume, settings, onClose }: EditorDocument & { onClose: () => void }) {
  const { t } = useTheme();
  const [includeContact, setIncludeContact] = useState(true);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  async function generate() {
    if (busy) return;
    setBusy(true); setError(''); setCopied(false);
    try { setUrl(await generateShareUrl(resume, settings, { includeContact, includePersonal })); }
    catch (cause) {
      setError(t(errorMessage(cause) === 'SHARE_TOO_LARGE'
        ? 'This resume is too large for a share link. Export a PDF or JSON backup instead.'
        : 'Could not create the share link. Please try again.'));
    }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError(t('Copy the link from the field above.')); }
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent closeLabel={t('Close')} className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t('Share resume')}</DialogTitle>
        <DialogDescription>{t('Only visible sections are shared. Uploaded photos are excluded.')}</DialogDescription>
      </DialogHeader>
      <fieldset className="flex flex-col gap-3" disabled={busy}>
        <legend className="mb-3 text-sm font-medium">{t('Choose what to include')}</legend>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeContact} onCheckedChange={checked => { setIncludeContact(checked); setUrl(''); }} />{t('Contact details: phone, email and website')}</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={includePersonal} onCheckedChange={checked => { setIncludePersonal(checked); setUrl(''); }} />{t('Personal details: city, birthday and status')}</label>
      </fieldset>
      <p className="text-xs leading-5 text-muted-foreground">{t('Anyone with this link can read its contents. It is a snapshot and cannot be revoked; later edits will not update it.')}</p>
      {url && <Input aria-label={t('Share link')} readOnly value={url} onFocus={event => event.target.select()} />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Close')}</Button>
        {url ? <Button onClick={copy}>{t(copied ? 'Copied' : 'Copy link')}</Button> : <Button disabled={busy} onClick={generate}>{t(busy ? 'Creating link…' : 'Create share link')}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
