// Service illustrations, merged from the three illustration files (artA/artB/artC, each `export const ART: Record<serviceId, FC<{size}>>`).
// Defensive: a file that is missing, fails to load or exports something odd contributes nothing, and any id without art falls back to the
// existing 3D render (see SvcArt in pages/parts.tsx). The requires sit in try/catch so Metro treats them as optional dependencies.
import React from 'react';

export type ArtFC = React.FC<{ size: number }>;
type ArtMap = Record<string, ArtFC>;

function pick(load: () => any): ArtMap {
  try {
    const m = load();
    const a = m && (m.ART || (m.default && m.default.ART) || m.default);
    if (!a || typeof a !== 'object') return {};
    const out: ArtMap = {};
    for (const k of Object.keys(a)) if (typeof a[k] === 'function' || (a[k] && typeof a[k] === 'object' && '$$typeof' in a[k])) out[k] = a[k];
    return out;
  } catch (e) {
    return {};
  }
}

export const ART: ArtMap = Object.assign(
  {},
  pick(() => require('./artA')),
  pick(() => require('./artB')),
  pick(() => require('./artC')),
);

/** the illustration for a service / pack id (packs are drawn as 'pack-<id>'), or null when none was drawn */
export function artFor(id: string | undefined | null): ArtFC | null {
  return (id && (ART[id] || ART['pack-' + id])) || null;
}

/** Renders one illustration and swallows a render error (a broken drawing must never take a screen down). */
export class ArtBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch() {}
  render() { return this.state.bad ? this.props.fallback : this.props.children; }
}
