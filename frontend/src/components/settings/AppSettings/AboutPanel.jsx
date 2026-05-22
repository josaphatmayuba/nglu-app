import { GitCommitHorizontal, Info, Tag } from "lucide-react";

// ── Parse CHANGELOG.md sections ──────────────────────────────────────────────
function parseChangelog(raw) {
  const sections = [];
  const lines = raw.split("\n");
  let current = null;

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(.+?)\](?:\s+-\s+(.+))?/);
    if (versionMatch) {
      if (current) sections.push(current);
      current = { version: versionMatch[1], date: versionMatch[2] || null, groups: [] };
      continue;
    }
    if (!current) continue;

    const groupMatch = line.match(/^### (.+)/);
    if (groupMatch) {
      current.groups.push({ label: groupMatch[1], items: [] });
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && current.groups.length > 0) {
      current.groups[current.groups.length - 1].items.push(itemMatch[1]);
    } else if (itemMatch) {
      if (!current.groups.length) current.groups.push({ label: null, items: [] });
      current.groups[0].items.push(itemMatch[1]);
    }
  }
  if (current) sections.push(current);
  return sections;
}

const JIRA_KEY = /\b(SCRUM-\d+)\b/g;

function renderItem(text) {
  const parts = text.split(JIRA_KEY);
  return parts.map((part, i) =>
    JIRA_KEY.test(part)
      ? <span key={i} className="font-mono text-xs bg-ink-100 px-1 py-0.5 rounded text-ink-700">{part}</span>
      : <span key={i}>{part}</span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AboutPanel() {
  const baseVersion = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const buildVersion = import.meta.env.VITE_APP_BUILD_VERSION || "—";
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const changelogRaw = import.meta.env.VITE_APP_CHANGELOG || "";

  const sections = parseChangelog(changelogRaw);

  return (
    <div className="space-y-4 p-4">
      {/* Version card */}
      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-ink-900 text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-600" />
              Version de l&apos;application
            </h3>
            <p className="text-xs text-ink-500 mt-1">Build actuellement déployé</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-semibold border border-brand-200 whitespace-nowrap">
            <Tag className="w-3.5 h-3.5" />
            v{baseVersion}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-ink-50 rounded-lg p-3">
            <div className="text-xs text-ink-500 font-medium mb-1">Version de base</div>
            <div className="text-sm font-mono font-semibold text-ink-900">{baseVersion}</div>
          </div>
          <div className="bg-ink-50 rounded-lg p-3">
            <div className="text-xs text-ink-500 font-medium mb-1">Build complet</div>
            <div className="text-sm font-mono font-semibold text-ink-900 truncate">{buildVersion}</div>
          </div>
          <div className="bg-ink-50 rounded-lg p-3">
            <div className="text-xs text-ink-500 font-medium mb-1 flex items-center gap-1">
              <GitCommitHorizontal className="w-3 h-3" /> Commit
            </div>
            <div className="text-sm font-mono font-semibold text-ink-900">{commit}</div>
          </div>
        </div>
      </div>

      {/* Changelog */}
      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <h3 className="font-semibold text-ink-900 text-lg mb-4">Journal des modifications</h3>

        {sections.length === 0 && (
          <p className="text-sm text-ink-500">Aucun journal disponible.</p>
        )}

        <div className="space-y-5">
          {sections.map((section, si) => {
            const isUnreleased = section.version === "Unreleased";
            return (
              <div key={si} className={si > 0 ? "border-t border-ink-100 pt-5" : ""}>
                <div className="flex items-center gap-2 mb-3">
                  {isUnreleased ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      En cours
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      v{section.version}
                    </span>
                  )}
                  {section.date && (
                    <span className="text-xs text-ink-400">{section.date}</span>
                  )}
                  {isUnreleased && (
                    <span className="text-xs text-ink-400 font-mono">[Unreleased]</span>
                  )}
                </div>

                {section.groups.map((group, gi) => (
                  <div key={gi} className={gi > 0 ? "mt-3" : ""}>
                    {group.label && (
                      <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                        {group.label}
                      </div>
                    )}
                    <ul className="space-y-1.5 pl-1">
                      {group.items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2 text-sm text-ink-700">
                          <span className={`inline-block mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isUnreleased ? "bg-brand-500" : "bg-ink-400"}`} />
                          <span>{renderItem(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
