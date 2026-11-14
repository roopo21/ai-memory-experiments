import { structuresForSex, skeletonReport } from '../data/anatomy'
import { useAnatomyStore } from '../store/useAnatomyStore'
const bones = structuresForSex('male', 'skeleton')
const regions = [...new Set(bones.map(s => s.region!))]
export default function SkeletonBrowser() {
  const selected = useAnatomyStore(s => s.selectedMesh)
  const select = useAnatomyStore(s => s.selectStructure)
  const isolated = useAnatomyStore(s => s.isolated)
  const setIsolated = useAnatomyStore(s => s.setIsolated)
  return <div className="space-y-3 px-1 pb-4">
    <div className="rounded-xl border border-amber-100/15 bg-amber-100/5 p-3 text-xs leading-relaxed text-[var(--muted)]">
      <p className="font-semibold text-[var(--text)]">Male skeleton · source-derived experiment</p>
      <p>{skeletonReport.structures} selectable structures · {(skeletonReport.triangles / 1e6).toFixed(2)}M triangles</p>
      <p className="mt-2">199 standard bones represented, plus foot sesamoids and 28 teeth. Sternum has three parts.</p>
      <details className="mt-2"><summary className="cursor-pointer">Coverage and source</summary>
        <p className="mt-2">Missing separate coccyx, six ear ossicles, and four wisdom teeth. Source resolution is preserved; anatomical landmarks are not clinically reviewed.</p>
        <a className="mt-2 block underline" href="/models/ATTRIBUTION.md" target="_blank" rel="noreferrer">BodyParts3D · source and licence</a>
      </details>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isolated} onChange={e => setIsolated(e.target.checked)} /> Isolate selected structure</label>
    {regions.map(region => <details key={region} className="rounded-lg border border-white/10">
      <summary className="cursor-pointer p-2 text-sm">{region} <span className="text-[var(--muted)]">· {bones.filter(s => s.region === region).length}</span></summary>
      <div className="max-h-64 overflow-y-auto p-1">{bones.filter(s => s.region === region).sort((a,b) => a.displayName.localeCompare(b.displayName)).map(s => <button key={s.meshName} aria-pressed={selected === s.meshName} onClick={() => select(s.meshName, {focus: true, activate: true})} className={`block w-full rounded p-2 text-left text-xs hover:bg-white/10 ${selected === s.meshName ? 'bg-white/15' : ''}`}>{s.displayName}</button>)}</div>
    </details>)}
  </div>
}
