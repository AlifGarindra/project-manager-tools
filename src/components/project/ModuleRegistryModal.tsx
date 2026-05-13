import { useState } from 'react'
import { C } from '../ui/tokens'
import { Btn } from '../ui/Btn'
import { Input, Sel } from '../ui/FormControls'
import { useAppStore } from '../../stores/appStore'
import { generateId } from '../../lib/utils'
import type { Module } from '../../types'

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

export function ModuleRegistryModal() {
  const { projects, selectedProjectId, saveProject, closeRegistry } = useAppStore()
  const project = projects.find(p => p.id === selectedProjectId)!
  const [modules, setModules] = useState<Module[]>([...project.modules])
  const [name, setName] = useState('')
  const [cat, setCat]   = useState('Core')

  const categories = [...new Set(modules.map(m => m.category))]
  const allCats    = [...new Set([...categories, 'Core', 'Auth', 'Infra', 'Operations', 'Other'])]

  const add = () => {
    if (!name.trim()) return
    setModules(prev => [...prev, { id: generateId('m'), name: name.trim(), category: cat }])
    setName('')
  }

  const remove = (id: string) => setModules(prev => prev.filter(m => m.id !== id))

  const save = () => {
    saveProject({ ...project, modules })
    closeRegistry()
  }

  return (
    <ModalShell title="Module Registry" subtitle={project.name} onClose={closeRegistry}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        <Input value={name} onChange={setName} placeholder="Module name…" style={{ flex: 1 }} />
        <Sel value={cat} onChange={setCat} style={{ width: 110, flexShrink: 0 }}>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </Sel>
        <Btn variant="primary" size="sm" onClick={add}>Add</Btn>
      </div>

      {categories.map(c => (
        <div key={c} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{c}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {modules.filter(m => m.category === c).map(mod => (
              <div key={mod.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '6px 9px', background: '#0c0c0e', border: `1px solid ${C.border}`, borderRadius: 5, gap: 8,
              }}>
                <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{mod.name}</span>
                <button onClick={() => remove(mod.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="default" size="sm" onClick={closeRegistry}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={save}>Save Registry</Btn>
      </div>
    </ModalShell>
  )
}
