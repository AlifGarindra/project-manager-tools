import { useState } from 'react'
import { C } from './components/ui/tokens'
import { Badge } from './components/ui/Badge'
import { Btn } from './components/ui/Btn'
import { DashboardView } from './components/project/DashboardView'
import { TimelineView } from './components/timeline/TimelineView'
import { BoardView } from './components/board/BoardView'
import { ConflictPanel } from './components/conflicts/ConflictPanel'
import { TicketModal } from './components/tickets/TicketModal'
import { ModuleRegistryModal } from './components/project/ModuleRegistryModal'
import { EnvManagerModal } from './components/project/EnvManagerModal'
import { useAppStore } from './stores/appStore'
import { useConflicts } from './hooks/useConflicts'

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '3px 11px', borderRadius: 4,
        fontSize: 12, fontWeight: 500,
        background: active ? C.surfaceEl : 'transparent',
        color: active ? C.text : hov ? C.textSec : C.textMut,
        border: active ? `1px solid ${C.border}` : '1px solid transparent',
        cursor: 'pointer', transition: 'all 0.1s', fontFamily: 'Inter, sans-serif',
      }}
    >{label}</button>
  )
}

export default function App() {
  const {
    view, setView,
    projects, tickets, selectedProjectId,
    conflictPanelOpen, toggleConflicts,
    registryOpen, openRegistry,
    envManagerOpen, openEnvManager,
    setProject: _setProject,
  } = useAppStore()

  const allConflicts = useConflicts(tickets)
  const [confBtnHov, setConfBtnHov] = useState(false)

  const project   = projects.find(p => p.id === selectedProjectId)
  const pConf     = allConflicts.filter(c => c.projectId === selectedProjectId)
  const hardC     = pConf.filter(c => c.type === 'hard').length
  const softC     = pConf.filter(c => c.type === 'soft').length
  const totalConfl = pConf.length
  const inProject  = view === 'timeline' || view === 'board'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', minWidth: 1024,
      background: C.bg, fontFamily: 'Inter, sans-serif',
      color: C.text, overflow: 'hidden',
    }}>
      {/* Top nav */}
      <nav style={{
        height: 44, flexShrink: 0,
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, zIndex: 10,
      }}>
        {/* Logo */}
        <button
          onClick={() => setView('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', borderRadius: 4 }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: `${C.accent}20`, border: `1px solid ${C.accent}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: C.accent, letterSpacing: '-0.02em',
          }}>D</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>DCM</span>
        </button>

        <div style={{ width: 1, height: 18, background: C.border }} />

        {inProject && project && (
          <>
            <button
              onClick={() => setView('dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 5px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: C.textMut }}
            >Projects</button>
            <span style={{ fontSize: 11, color: C.textMut }}>/</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>{project.name}</span>
            <div style={{ width: 1, height: 18, background: C.border }} />
          </>
        )}

        {inProject && (
          <div style={{ display: 'flex', gap: 2, background: '#0c0c0e', borderRadius: 5, padding: 2, border: `1px solid ${C.border}` }}>
            <NavTab label="Timeline" active={view === 'timeline'} onClick={() => setView('timeline')} />
            <NavTab label="Board"    active={view === 'board'}    onClick={() => setView('board')} />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {inProject && (
          <>
            <Btn variant="ghost" size="sm" onClick={openRegistry}>Modules</Btn>
            <Btn variant="ghost" size="sm" onClick={openEnvManager}>Environments</Btn>

            <div style={{ width: 1, height: 18, background: C.border }} />

            {/* Conflict toggle */}
            <button
              onMouseEnter={() => setConfBtnHov(true)}
              onMouseLeave={() => setConfBtnHov(false)}
              onClick={toggleConflicts}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 5,
                background: conflictPanelOpen ? `${C.accent}12` : confBtnHov ? C.surfaceEl : 'transparent',
                border: `1px solid ${conflictPanelOpen ? C.accent + '35' : confBtnHov ? C.borderEl : C.border}`,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.1s',
              }}
            >
              {totalConfl > 0 ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {hardC > 0 && <Badge type="hard">{hardC}</Badge>}
                  {softC > 0 && <Badge type="soft">{softC}</Badge>}
                </div>
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, opacity: 0.8 }} />
              )}
              <span style={{ fontSize: 11, color: conflictPanelOpen ? C.textSec : C.textMut }}>Conflicts</span>
            </button>
          </>
        )}

        {/* Avatar */}
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#71717a', letterSpacing: '0.04em', flexShrink: 0,
        }}>PM</div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {view === 'dashboard' && <DashboardView />}
        {view === 'timeline' && (
          <>
            <TimelineView />
            {conflictPanelOpen && <ConflictPanel />}
          </>
        )}
        {view === 'board' && (
          <>
            <BoardView />
            {conflictPanelOpen && <ConflictPanel />}
          </>
        )}
      </div>

      {/* Modals */}
      <TicketModal />
      {registryOpen   && <ModuleRegistryModal />}
      {envManagerOpen && <EnvManagerModal />}
    </div>
  )
}
