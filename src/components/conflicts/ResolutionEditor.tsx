import { useState } from 'react'
import { C } from '../ui/tokens'
import { Btn } from '../ui/Btn'
import { Input, Textarea } from '../ui/FormControls'
import { useSaveResolution, useDeleteResolution } from '../../hooks/useConflictResolutions'
import type { ConflictPair, ConflictResolution } from '../../types'

/**
 * Editor kesepakatan hasil diskusi untuk satu konflik.
 * Dipakai di ConflictPanel dan TicketModal — tambah, edit, dan hapus
 * resolusi (link notulen + catatan cara resolve) per pasangan tiket.
 */
export function ResolutionEditor({ conflict, resolution }: {
  conflict: ConflictPair
  resolution?: ConflictResolution
}) {
  const [editing, setEditing] = useState(false)
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const { mutate: saveResolution, isPending: saving } = useSaveResolution()
  const { mutate: deleteResolution } = useDeleteResolution()

  const openForm = () => {
    setLink(resolution?.link ?? '')
    setNote(resolution?.note ?? '')
    setEditing(true)
  }

  const submit = () => {
    if (!link.trim() && !note.trim()) return
    saveResolution(
      {
        projectId: conflict.projectId,
        ticket1Id: conflict.ticket1Id,
        ticket2Id: conflict.ticket2Id,
        link: link.trim(),
        note: note.trim(),
      },
      { onSuccess: () => setEditing(false) }
    )
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 9px', background: '#0c0c0e', border: `1px solid ${C.border}`, borderRadius: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.textSec }}>Kesepakatan hasil diskusi</span>
        <Input value={link} onChange={setLink} placeholder="Link notulen/hasil diskusi (opsional)" />
        <Textarea value={note} onChange={setNote} placeholder="Kesepakatan & cara resolve — mis. tetap jalan, deploy backend duluan jam 09:00…" rows={3} />
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <Btn variant="default" size="xs" onClick={() => setEditing(false)}>Batal</Btn>
          <Btn variant="primary" size="xs" onClick={submit} disabled={saving || (!link.trim() && !note.trim())}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Btn>
        </div>
      </div>
    )
  }

  if (resolution) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 9px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.green }}>✓ Sudah didiskusikan — tetap dijalankan</span>
          <div style={{ flex: 1 }} />
          <button onClick={openForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 9, padding: 0, textDecoration: 'underline' }}>Edit</button>
          <button onClick={() => deleteResolution(resolution.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 9, padding: 0, textDecoration: 'underline' }}>Hapus</button>
        </div>
        {resolution.note && <span style={{ fontSize: 10, color: C.textSec, lineHeight: 1.55 }}>{resolution.note}</span>}
        {resolution.link && (
          <a href={resolution.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.blue, textDecoration: 'none' }}>
            Buka hasil diskusi ↗
          </a>
        )}
      </div>
    )
  }

  return <Btn variant="default" size="xs" onClick={openForm}>+ Tandai sudah didiskusikan</Btn>
}
