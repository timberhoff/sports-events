import { useEffect, useMemo, useRef, useState } from "react";
console.log("SportLeagueDropdown file loaded");

/**
 * Props:
 * - valueSummary: string shown on the button (e.g. "All sports")
 * - onChange: (state) => void   // optional: lift state to parent later
 *
 * This component internally:
 * - loads sports
 * - lazy loads league tree per sport when the sport is expanded first time
 * - stores selection in localStorage
 */
export default function SportLeagueDropdown({
  storageKey = "sportsLeagueFilter_v1",
  onStateChange,
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const [didHydrate, setDidHydrate] = useState(false);

  const initializedSportsRef = useRef(new Set());

  const [sports, setSports] = useState([]);
  const [leagueTreesBySport, setLeagueTreesBySport] = useState({}); // sportId -> tree array
  const [loadingSportTree, setLoadingSportTree] = useState({}); // sportId -> boolean

  // Green/Gray state:
  // - disabledSports: sportIds that are gray (override all leagues under)
  // - disabledNodes: nodeIds that are gray (cascade down logically)
  // - expandedSports: sportIds expanded in UI
  // - expandedNodes: nodeIds expanded in UI
  const [disabledSports, setDisabledSports] = useState(new Set());
  const [disabledNodes, setDisabledNodes] = useState(new Set());
  const [expandedSports, setExpandedSports] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [initializedSports, setInitializedSports] = useState(new Set());
  const enableSport = (sportId) => {
    setDisabledSports((prev) => {
      const next = new Set(prev);
      next.delete(sportId);
      return next;
    });
  };

  const enableNodes = (ids) => {
    setDisabledNodes((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  useEffect(() => {
    initializedSportsRef.current = initializedSports;
  }, [initializedSports]);

  // ---- Load persisted state on mount ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      console.log("LOAD raw:", raw);

      if (raw) {
        const parsed = JSON.parse(raw);
        console.log("LOAD parsed:", parsed);

        setDisabledSports(new Set(parsed.disabledSports || []));
        setDisabledNodes(new Set(parsed.disabledNodes || []));
        setExpandedSports(new Set(parsed.expandedSports || []));
        setExpandedNodes(new Set(parsed.expandedNodes || []));

        const init = new Set(parsed.initializedSports || []);
        setInitializedSports(init);
        initializedSportsRef.current = init;
      }
    } catch (e) {
      console.warn("Failed to load filter state:", e);
    } finally {
      setDidHydrate(true);
    }
  }, [storageKey]);

  // ---- Persist state whenever it changes ----
  useEffect(() => {
    if (!didHydrate) return;

    const loadedSports = Object.keys(leagueTreesBySport).map(Number);

    const allowedLeagueIds = collectAllowedLeagueIds({
      sports,
      leagueTreesBySport,
      disabledSports,
      disabledNodes,
    });

    const payload = {
      disabledSports: Array.from(disabledSports),
      disabledNodes: Array.from(disabledNodes),
      expandedSports: Array.from(expandedSports),
      expandedNodes: Array.from(expandedNodes),
      initializedSports: Array.from(initializedSports),
      allowedLeagueIds,
      loadedSports,
    };

    console.log("SAVING", payload);
    localStorage.setItem(storageKey, JSON.stringify(payload));
    onStateChange?.(payload);
  }, [
    didHydrate,
    sports,
    leagueTreesBySport,
    disabledSports,
    disabledNodes,
    expandedSports,
    expandedNodes,
    initializedSports,
    storageKey,
    onStateChange,
  ]);

  function collectAllowedLeagueIds({
    sports,
    leagueTreesBySport,
    disabledSports,
    disabledNodes,
  }) {
    const allowed = [];

    for (const sp of sports) {
      if (disabledSports.has(sp.id)) continue;

      const tree = leagueTreesBySport[sp.id];
      if (!tree) continue;

      const walk = (nodes, ancestorDisabled = false) => {
        for (const n of nodes) {
          const currentDisabled = ancestorDisabled || disabledNodes.has(n.id);

          const isLeaf = !n.children || n.children.length === 0;
          const isSelectable = n.node_type === "league" || isLeaf;

          if (isSelectable && !currentDisabled) {
            allowed.push(n.id);
          }

          if (n.children?.length) {
            walk(n.children, currentDisabled);
          }
        }
      };

      walk(tree, false);
    }

    return allowed;
  }

  // ---- Close dropdown when clicking outside ----
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  // ---- Load sports list ----
  useEffect(() => {
    (async () => {
      const r = await fetch("http://localhost:3001/api/sports");
      const data = await r.json();
      setSports(data);
    })();
  }, []);

  useEffect(() => {
    if (!didHydrate) return;
    if (!sports.length) return;

    // for each expanded sport, ensure its tree is loaded
    expandedSports.forEach((sportId) => {
      if (leagueTreesBySport[sportId]) return;
      if (loadingSportTree[sportId]) return;

      (async () => {
        try {
          setLoadingSportTree((p) => ({ ...p, [sportId]: true }));
          const r = await fetch(
            `http://localhost:3001/api/league-tree?sport_id=${sportId}`
          );
          const tree = await r.json();
          setLeagueTreesBySport((p) => ({ ...p, [sportId]: tree }));

          // Apply defaults only if not initialized before
          if (!initializedSportsRef.current.has(sportId)) {
            setDisabledNodes((prev) => {
              const next = new Set(prev);

              const markDefaults = (nodes) => {
                for (const n of nodes) {
                  if (n.is_default === 0) next.add(n.id);
                  if (n.children?.length) markDefaults(n.children);
                }
              };

              markDefaults(tree);
              return next;
            });

            setInitializedSports((prev) => {
              const next = new Set(prev);
              next.add(sportId);
              return next;
            });
          }
        } finally {
          setLoadingSportTree((p) => ({ ...p, [sportId]: false }));
        }
      })();
    });
  }, [
    didHydrate,
    sports,
    expandedSports,
    leagueTreesBySport,
    loadingSportTree,
  ]);

  // ---- Helpers ----
  const isSportDisabled = (sportId) => disabledSports.has(sportId);

  const toggleSportDisabled = (sportId) => {
    setDisabledSports((prev) => {
      const next = new Set(prev);
      if (next.has(sportId)) next.delete(sportId);
      else next.add(sportId);
      return next;
    });
  };

  const toggleSportExpanded = async (sportId) => {
    setExpandedSports((prev) => {
      const next = new Set(prev);
      if (next.has(sportId)) next.delete(sportId);
      else next.add(sportId);
      return next;
    });

    // lazy load tree if not loaded yet
    if (!leagueTreesBySport[sportId] && !loadingSportTree[sportId]) {
      try {
        setLoadingSportTree((p) => ({ ...p, [sportId]: true }));
        const r = await fetch(
          `http://localhost:3001/api/league-tree?sport_id=${sportId}`
        );
        const tree = await r.json();
        setLeagueTreesBySport((p) => ({ ...p, [sportId]: tree }));
        if (!initializedSportsRef.current.has(sportId)) {
          setDisabledNodes((prev) => {
            const next = new Set(prev);

            const markDefaults = (nodes) => {
              for (const n of nodes) {
                if (n.is_default === 0) next.add(n.id);
                if (n.children?.length) markDefaults(n.children);
              }
            };

            markDefaults(tree);
            return next;
          });

          setInitializedSports((prev) => {
            const next = new Set(prev);
            next.add(sportId);
            return next;
          });
        }
      } finally {
        setLoadingSportTree((p) => ({ ...p, [sportId]: false }));
      }
    }
  };

  const isNodeDisabled = (nodeId) => disabledNodes.has(nodeId);

  const toggleNodeDisabled = (nodeId) => {
    setDisabledNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const toggleNodeExpanded = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Button summary (simple for now)
  const summaryText = useMemo(() => {
    const disabledCount = disabledSports.size;
    if (disabledCount === 0) return "All sports";
    return `Sports filtered (${disabledCount} off)`;
  }, [disabledSports]);

  const resetToDefaults = () => {
    // For now: clear user overrides (everything on). Later we’ll apply league_nodes.is_default properly.
    setDisabledSports(new Set());
    setDisabledNodes(new Set());
    setExpandedSports(new Set());
    setExpandedNodes(new Set());
    setInitializedSports(new Set());
  };

  const collectSubtreeIds = (node) => {
    const ids = [node.id];
    if (node.children?.length) {
      for (const ch of node.children) ids.push(...collectSubtreeIds(ch));
    }
    return ids;
  };

  const isSubtreeFullyEnabled = (node, disabledSet) => {
    const ids = collectSubtreeIds(node);
    return ids.every((id) => !disabledSet.has(id));
  };

  const setSubtreeEnabled = (node, enabled) => {
    const ids = collectSubtreeIds(node);

    setDisabledNodes((prev) => {
      const next = new Set(prev);

      if (enabled) {
        // enable => remove disabled flags
        ids.forEach((id) => next.delete(id));
      } else {
        // disable => add disabled flags
        ids.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  return (
    <div className="sport-league-dropdown" ref={panelRef}>
      <label>Sport</label>
      <div>
        <button
          type="button"
          className="sport-dropdown-btn"
          onClick={() => setOpen((v) => !v)}
        >
          {summaryText} <span className="caret">▾</span>
        </button>
      </div>

      {open && (
        <div className="sport-dropdown-panel">
          <div className="panel-top">
            <button
              type="button"
              className="panel-btn"
              onClick={resetToDefaults}
            >
              Reset (defaults)
            </button>
          </div>

          <div className="panel-list">
            {sports.map((sp) => {
              const sportDisabled = isSportDisabled(sp.id);
              const sportExpanded = expandedSports.has(sp.id);
              const tree = leagueTreesBySport[sp.id] || [];
              const isLoading = !!loadingSportTree[sp.id];

              return (
                <div key={sp.id} className="sport-row">
                  <div
                    className={`sport-row-main ${
                      sportDisabled ? "is-gray" : "is-green"
                    }`}
                  >
                    <button
                      type="button"
                      className="arrow-btn"
                      onClick={() => toggleSportExpanded(sp.id)}
                      aria-label="Expand sport"
                    >
                      {sportExpanded ? "▾" : "▸"}
                    </button>

                    <button
                      type="button"
                      className="name-btn"
                      onClick={() => toggleSportDisabled(sp.id)}
                      title="Toggle include/exclude"
                    >
                      {sp.emoji ? `${sp.emoji} ` : ""}
                      {sp.name}
                    </button>
                  </div>

                  {sportExpanded && (
                    <div className="sport-children">
                      {isLoading && <div className="muted">Loading…</div>}

                      {!isLoading && tree.length === 0 && (
                        <div className="muted">No leagues yet</div>
                      )}

                      {!isLoading &&
                        tree.map((node) => (
                          <TreeNode
                            key={node.id}
                            node={node}
                            depth={0}
                            ancestors={[]} // ✅ NEW
                            sportId={sp.id} // ✅ NEW
                            sportDisabled={sportDisabled} // ✅ NEW
                            expandedNodes={expandedNodes}
                            onToggleExpand={toggleNodeExpanded}
                            isDisabled={(id) =>
                              isNodeDisabled(id) || sportDisabled
                            }
                            onToggleDisabled={toggleNodeDisabled}
                            disabledNodes={disabledNodes}
                            onSetSubtreeEnabled={setSubtreeEnabled}
                            isSubtreeFullyEnabledFn={isSubtreeFullyEnabled}
                            onEnableNodes={enableNodes} // ✅ NEW
                            onEnableSport={enableSport} // ✅ NEW
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function TreeNode({
  node,
  depth,
  ancestors, // ✅ NEW
  sportId, // ✅ NEW
  sportDisabled, // ✅ NEW
  expandedNodes,
  onToggleExpand,
  isDisabled,
  onToggleDisabled,
  disabledNodes,
  onSetSubtreeEnabled,
  isSubtreeFullyEnabledFn,
  onEnableNodes, // ✅ NEW
  onEnableSport, // ✅ NEW
}) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = expandedNodes.has(node.id);
  const disabled = isDisabled(node.id);

  const subtreeAllEnabled =
    hasChildren && isSubtreeFullyEnabledFn(node, disabledNodes);

  const fullPathIds = [...ancestors, node.id]; // ✅ parents + self

  return (
    <div className="tree-node" style={{ marginLeft: depth * 14 }}>
      <div className={`tree-node-main ${disabled ? "is-gray" : "is-green"}`}>
        <button
          type="button"
          className={`arrow-btn ${hasChildren ? "" : "arrow-empty"}`}
          onClick={() => hasChildren && onToggleExpand(node.id)}
          aria-label="Expand node"
          disabled={!hasChildren}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : "•"}
        </button>

        <button
          type="button"
          className="name-btn"
          onClick={() => {
            if (disabled) {
              // ✅ If it’s gray because of parent/sport (or itself),
              // enable parents + self (and sport if needed)
              onEnableNodes(fullPathIds);
              if (sportDisabled) onEnableSport(sportId);
              return;
            }

            // normal behavior when already enabled
            onToggleDisabled(node.id);
          }}
          title="Toggle include/exclude"
        >
          {node.name}
        </button>

        {hasChildren && (
          <button
            type="button"
            className="subtree-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSetSubtreeEnabled(node, !subtreeAllEnabled);
            }}
            title={
              subtreeAllEnabled
                ? "Deselect all in this branch"
                : "Select all in this branch"
            }
          >
            {subtreeAllEnabled ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              ancestors={fullPathIds} // ✅ NEW: pass path down
              sportId={sportId}
              sportDisabled={sportDisabled}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              isDisabled={(id) => disabled || isDisabled(id)} // keep cascade
              onToggleDisabled={onToggleDisabled}
              disabledNodes={disabledNodes}
              onSetSubtreeEnabled={onSetSubtreeEnabled}
              isSubtreeFullyEnabledFn={isSubtreeFullyEnabledFn}
              onEnableNodes={onEnableNodes}
              onEnableSport={onEnableSport}
            />
          ))}
        </div>
      )}
    </div>
  );
}
