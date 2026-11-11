const en = {
  import: 'Import PDF / backup', backup: 'Back up all', title: 'Import a resume',
  intro: 'Choose a text PDF or JSON backup. PDF text is processed in your browser. Review it before creating an editable copy.',
  file: 'PDF or JSON file', choose: 'Choose a file', review: 'Review imported content',
  pdfNote: 'Check the detected fields and text. Complex layouts may need adjustments in the editor. Scanned PDFs need OCR and are not supported yet.',
  source: 'Extracted text', name: 'Name', email: 'Email', phone: 'Phone', headline: 'Job title', resumeTitle: 'Resume name',
  create: 'Create editable copy', restore: 'Restore as new copies', cancel: 'Cancel', close: 'Close',
  copies: 'Resumes to restore', safe: 'Restoration creates new copies. Existing resumes are kept.',
  sections: 'Detected sections', reading: 'Reading file…', creating: 'Creating…', empty: 'Create a resume before backing up.',
  done: 'Import complete.', failed: 'Could not create the resume. Check your connection, sign-in and workspace limits, then retry.',
  partial: 'Some copies were created. Only the remaining resumes are listed below; retry will not recreate completed copies.',
  history: 'Version history', historyNote: 'Automatic snapshots on this browser, separated by account. The latest 30 versions are kept. Download JSON backups to keep copies outside this browser.',
  historyEmpty: 'No earlier versions yet. Changes are saved here automatically.', restoreVersion: 'Restore this version', downloadVersion: 'Back up this version',
  historyError: 'Version history is unavailable. Check browser storage and download a JSON backup to keep a copy.',
  versionCount: 'Saved versions', restoreNote: 'Your current content is saved as a version before restoration. You can also undo a restoration in the editor.',
  word: 'Export Word (.docx)',
  fileTooLarge: 'Choose a file smaller than 25 MB.', tooManyPages: 'Choose a PDF with 30 pages or fewer.',
  tooMuchText: 'This PDF contains too much text. Import a shorter resume (up to 200,000 characters).',
  invalidPdf: 'Could not read this PDF. Try exporting a fresh PDF or use a JSON backup.',
  noText: 'No readable text was found. Scanned or image-only PDFs need OCR first. No resume has been created.',
  passwordPdf: 'This PDF is password protected. Unlock it before importing.',
  invalidBackup: 'This is not a valid resume backup. Use a JSON backup exported by JustCV or Open Resume.',
  unsupportedBackup: 'This backup format or version is not supported.',
  backupCount: 'A workspace backup supports 1–100 resumes. For larger workspaces, back up individual resumes in the editor.',
  backupTooLarge: 'This workspace backup exceeds 25 MB. Back up individual resumes in the editor.',
  remaining: 'Remaining', reparse: 'Update detected sections', progress: 'Pages read',
} as const;
const zh: Record<keyof typeof en, string> = {
  import: '导入 PDF / 备份', backup: '备份全部', title: '导入简历',
  intro: '选择文字型 PDF 或 JSON 备份。PDF 在浏览器内解析，确认内容后再创建可编辑副本。',
  file: 'PDF 或 JSON 文件', choose: '选择文件', review: '核对导入内容',
  pdfNote: '请核对识别字段和正文，复杂排版可能需要在编辑器中调整。扫描件需要先做 OCR，暂不支持直接识别。',
  source: '提取的文字', name: '姓名', email: '邮箱', phone: '电话', headline: '求职岗位', resumeTitle: '简历名称',
  create: '创建可编辑副本', restore: '恢复为新副本', cancel: '取消', close: '关闭',
  copies: '待恢复的简历', safe: '恢复会创建新副本，保留现有简历。', sections: '识别到的模块', reading: '正在读取文件…', creating: '正在创建…',
  empty: '请先创建简历，再导出备份。', done: '导入完成。', failed: '创建失败，请检查网络、登录状态和当前账号的简历额度后重试。',
  partial: '部分简历已创建成功，下方仅保留尚未完成的简历，重试不会重复创建已完成的副本。',
  history: '历史版本', historyNote: '自动快照保存在当前浏览器中，按账号隔离，保留最近 30 个版本。需要在浏览器外保留副本时，请下载 JSON 备份。',
  historyEmpty: '还没有历史版本，编辑后会自动保存快照。', restoreVersion: '恢复此版本', downloadVersion: '备份此版本',
  historyError: '无法使用历史版本，请检查浏览器存储，并下载 JSON 备份保留副本。',
  versionCount: '已保存的版本', restoreNote: '恢复前会先保存当前内容，也可在编辑器中撤销本次恢复。', word: '导出 Word (.docx)',
  fileTooLarge: '请选择小于 25 MB 的文件。', tooManyPages: '请选择不超过 30 页的 PDF。', tooMuchText: 'PDF 文字过多，请导入较短的简历（最多 20 万字）。',
  invalidPdf: '无法读取这个 PDF，请重新导出 PDF，或使用 JSON 备份。', noText: '未找到可读取的文字。扫描件或纯图片 PDF 需要先做 OCR，尚未创建简历。',
  passwordPdf: '这个 PDF 有密码保护，请解锁后再导入。', invalidBackup: '文件不是有效的简历备份，请使用 JustCV 或 Open Resume 导出的 JSON 文件。',
  unsupportedBackup: '暂不支持这个备份格式或版本。', backupCount: '工作空间备份支持 1–100 份简历，更多简历请在编辑器中分别备份。',
  backupTooLarge: '全部备份超过 25 MB，请在编辑器中分别备份简历。', remaining: '尚未完成', reparse: '更新识别结果', progress: '已读取页数',
};
export function transferText(lang: string, key: keyof typeof en) {
  return lang.startsWith('zh') ? zh[key] : en[key];
}
export function transferError(lang: string, error: unknown) {
  const key = error instanceof Error ? error.message : '';
  return key in en ? transferText(lang, key as keyof typeof en) : transferText(lang, 'failed');
}
