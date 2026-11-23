import { useState } from 'react'
import {
  structures,
  type SystemId,
  skeletonReport,
  muscleReport,
  systems,
  organReport,
  nerveReport,
  muscleChunks,
} from '../anatomy/catalogue'
import { useAnatomyStore } from '../state/useAnatomyStore'
export default function StructureBrowser() {
  const [system, setSystem] = useState<SystemId>('muscular')
  const selected = useAnatomyStore((s) => s.selectedMesh)
  const select = useAnatomyStore((s) => s.selectStructure)
  const isolated = useAnatomyStore((s) => s.isolated)
  const setIsolated = useAnatomyStore((s) => s.setIsolated)
  const hidden = useAnatomyStore((s) => s.hiddenMeshes)
  const restore = useAnatomyStore((s) => s.restoreStructures)
  const hide = useAnatomyStore((s) => s.hideStructure)
  const muscleRegion = useAnatomyStore((s) => s.muscleRegion)
  const setRegion = useAnatomyStore((s) => s.setMuscleRegion)
  const items = structures.filter(
    (s) =>
      s.systems.includes(system) &&
      (system !== 'muscular' || !muscleRegion || s.region === muscleRegion),
  )
  const regions = [...new Set(items.map((s) => s.region!))]
  return (
    <div className="space-y-3 px-1 pb-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-[var(--muted)]">
        <p className="font-semibold text-[var(--text)]">One body · aligned source anatomy</p>
        <p>
          {skeletonReport.structures} skeletal structures · {muscleReport.structures} muscle/tendon
          structures · {organReport.structures} organ structures · {nerveReport.structures} nerve
          structures
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer">Coverage and source</summary>
          <p className="mt-2">
            Bones: 199 standard bones represented, plus sesamoid groups and 28 teeth. Missing
            separate coccyx, six ear ossicles and four wisdom teeth.
          </p>
          <p className="mt-2">
            Muscles: available source structures, including some grouped muscles and tendons.
            Attachments are not independently reviewed. Five internal systems are available with
            partial source coverage; vessels are a limited major-vessel selection. The spinal cord,
            cranial and peripheral nerves come from Z-Anatomy and are registered onto this body by
            one fitted similarity transform. Female anatomy is not imported.
          </p>
          <a
            className="mt-2 block underline"
            href="/models/ATTRIBUTION.md"
            target="_blank"
            rel="noreferrer"
          >
            BodyParts3D and Z-Anatomy · sources and licences
          </a>
        </details>
      </div>
      <label className="block text-xs">
        Browse system
        <select
          aria-label="Browse system"
          value={system}
          onChange={(e) => setSystem(e.target.value as SystemId)}
          className="mt-1 w-full rounded-lg bg-slate-900 p-2"
        >
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => useAnatomyStore.getState().showSystem(system)}
        className="w-full rounded-lg border border-white/20 p-2 text-sm"
      >
        Show only {system}
      </button>
      <label className="block text-xs text-[var(--muted)]">
        Muscle region
        <select
          aria-label="Muscle region"
          value={muscleRegion ?? ''}
          onChange={(e) => setRegion(e.target.value || null)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"
        >
          <option value="">All regions</option>
          {muscleChunks.map((c) => (
            <option key={c.region}>{c.region}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isolated} onChange={(e) => setIsolated(e.target.checked)} />{' '}
        Isolate selected structure
      </label>
      {hidden.length > 0 && (
        <button onClick={restore} className="rounded border border-white/20 px-3 py-2 text-xs">
          Restore {hidden.length} hidden structures
        </button>
      )}
      {regions.map((region) => (
        <details key={`${system}-${region}`} className="rounded-lg border border-white/10">
          <summary className="cursor-pointer p-2 text-sm">
            {region}{' '}
            <span className="text-[var(--muted)]">
              · {items.filter((s) => s.region === region).length}
            </span>
          </summary>
          <div className="max-h-64 overflow-y-auto p-1">
            {items
              .filter((s) => s.region === region)
              .sort((a, b) => a.displayName.localeCompare(b.displayName))
              .map((s) => (
                <div key={s.meshName} className="flex items-center gap-1">
                  <button
                    aria-pressed={selected === s.meshName}
                    onClick={() => select(s.meshName, { focus: true, activate: true })}
                    className={`min-w-0 flex-1 rounded p-2 text-left text-xs hover:bg-white/10 ${selected === s.meshName ? 'bg-white/15' : ''} ${hidden.includes(s.meshName) ? 'opacity-40' : ''}`}
                  >
                    {s.displayName}
                  </button>
                  <button
                    aria-label={`Hide ${s.displayName}`}
                    onClick={() => hide(s.meshName)}
                    className="rounded p-2 text-xs text-[var(--muted)] hover:bg-white/10"
                  >
                    Hide
                  </button>
                </div>
              ))}
          </div>
        </details>
      ))}
    </div>
  )
}
