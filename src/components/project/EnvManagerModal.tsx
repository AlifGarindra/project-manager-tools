import { useState } from 'react'
import { C } from '../ui/tokens'
import { Btn } from '../ui/Btn'
import { Input } from '../ui/FormControls'
import { useAppStore } from '../../stores/appStore'
import { generateId } from '../../lib/utils'
import type { Environment } from '../../types'

const ENV_COLORS = ['#e11d48', '#d97706', '#16a34a', '#0891b2', '#7c3aed', '#db2777', '#ea580c']

function ModalShell({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxHeight: '82vh', background: C.surface,
        border: `1px solid ${C.borderEl}`, borderRadius: 10,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 100px rgba(0,0,0,0.75)',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{title}</span>
          {subtitle && <span style={{ fontSize: 11, color: C.textMut }}>{subtitle}</span>}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>{children}</div>
      </div>
    </div>
  )
}

export function EnvManagerModal() {
  const { projects, selectedProjectId, saveProject, closeEnvManager } = useAppStore()
  const project = projects.find(p => p.id === selectedProjectId)!
  const [envs, setEnvs] = useState<Environment[]>([...project.environments])
  const [name, setName]   = useState('')
  const [color, setColor] = useState('#6366f1')

  const add = () => {
    if (!name.trim()) return
    setEnvs(prev => [...prev, { id: generateId('env'), name: name.trim().toLowerCase(), color, order: prev.length }])
    setName('')
  }

  const remove = (id: string) => setEnvs(prev => prev.filter(e => e.id !== id))

  const save = () => {
    saveProject({ ...project, environments: envs })
    closeEnvManager()
  }

  return (
    <ModalShell title="Environment Manager" subtitle={project.name} onClose={closeEnvManager}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        <Input value={name} onChange={setName} placeholder="e.g. canary" style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {ENV_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 20, height: 20, borderRadius: '50%', background: c,
              border: color === c ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }} />
          ))}
        </div>
        <Btn variant="primary" size="sm" onClick={add}>Add</Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {envs.map((env, i) => (
          <div key={env.id} style={{
            display: 'flex', alignItems: 'center',
            padding: '8px 10px', background: '#0c0c0e', border: `1px solid ${C.border}`, borderRadius: 5, gap: 10,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: env.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.text, flex: 1, textTransform: 'capitalize' }}>{env.name}</span>
            <span style={{ fontSize: 9, color: C.textMut }}>Order {i}</span>
            <button onClick={() => remove(env.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="default" size="sm" onClick={closeEnvManager}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={save}>Save Environments</Btn>
      </div>
    </ModalShell>
  )
}
