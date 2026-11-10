import { Button, cx, Tabs } from "@/ui";
import type { Selection } from "./AnnotationCanvas";
import type { FindingRow, ToothRow } from "./findings";

export type PanelTab = "findings" | "teeth";

export interface FindingsPanelProps {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  findings: FindingRow[];
  teeth: ToothRow[];
  selected: Selection | null;
  onSelect: (s: Selection | null) => void;
  canEdit: boolean;
  onChangeLabel: () => void;
  onDelete: () => void;
}

const pct = (score: number) => `${Math.round(score * 100)}%`;

function Row({ active, onClick, dot, label, tooth, score }: { active: boolean; onClick: () => void; dot: string; label: string; tooth?: string; score: number }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cx(
          "flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left text-base transition-colors last:border-b-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
          active ? "bg-brand-soft shadow-[inset_2px_0_0_rgb(var(--color-brand))]" : "hover:bg-page",
        )}
      >
        <span aria-hidden className={cx("h-2 w-2 shrink-0 rounded-sm", dot)} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {tooth !== undefined && <span className="num text-muted">{tooth}</span>}
        <span className="num w-10 text-right text-muted">{pct(score)}</span>
      </button>
    </li>
  );
}

export function FindingsPanel(p: FindingsPanelProps) {
  const isSelected = (type: Selection["type"], index: number) => p.selected?.type === type && p.selected.index === index;
  const toggle = (type: Selection["type"], index: number) => p.onSelect(isSelected(type, index) ? null : { type, index });
  const selectionInTab = p.selected && (p.tab === "teeth" ? p.selected.type === "teeth" : p.selected.type === "pathology");
  const pathologies = p.findings.filter((f) => !f.treatment);
  const treatments = p.findings.filter((f) => f.treatment);

  return (
    <section aria-label="Findings" className="flex min-w-0 flex-col self-start rounded border border-line bg-surface">
      <Tabs
        className="px-3"
        tabs={[
          { id: "findings", label: "Findings", count: p.findings.length },
          { id: "teeth", label: "Teeth", count: p.teeth.length },
        ]}
        value={p.tab}
        onChange={(t) => p.onTab(t as PanelTab)}
      />
      <div className="max-h-[520px] overflow-y-auto">
        {p.tab === "findings" ? (
          p.findings.length === 0 ? (
            <p className="px-3 py-8 text-center text-muted">No findings detected</p>
          ) : (
            <>
              {[
                { title: "Pathologies", rows: pathologies },
                { title: "Treatments", rows: treatments },
              ]
                .filter((g) => g.rows.length > 0)
                .map((g) => (
                  <div key={g.title}>
                    <p className="border-b border-line bg-page px-3 py-1.5 text-label font-medium text-muted">{g.title}</p>
                    <ul>
                      {g.rows.map((r) => (
                        <Row
                          key={r.index}
                          active={isSelected("pathology", r.index)}
                          onClick={() => toggle("pathology", r.index)}
                          dot="bg-annot-pathology"
                          label={r.label}
                          tooth={r.tooth ?? "—"}
                          score={r.score}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
            </>
          )
        ) : p.teeth.length === 0 ? (
          <p className="px-3 py-8 text-center text-muted">No teeth detected</p>
        ) : (
          <ul>
            {p.teeth.map((t) => (
              <Row
                key={t.index}
                active={isSelected("teeth", t.index)}
                onClick={() => toggle("teeth", t.index)}
                dot="bg-annot-tooth"
                label={`Tooth ${t.label}`}
                score={t.score}
              />
            ))}
          </ul>
        )}
      </div>
      {p.canEdit && (
        <div className="flex gap-2 border-t border-line p-3">
          <Button variant="secondary" size="sm" className="flex-1" disabled={!selectionInTab} onClick={p.onChangeLabel}>
            Change label
          </Button>
          <Button variant="danger" size="sm" disabled={!selectionInTab} onClick={p.onDelete}>
            Delete
          </Button>
        </div>
      )}
    </section>
  );
}
