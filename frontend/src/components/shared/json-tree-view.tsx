"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

interface NodeProps {
    value: JsonValue;
    path: string;
    collapsed: Set<string>;
    onToggle: (path: string) => void;
    depth?: number;
    keyName?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function collectCollapsiblePaths(value: JsonValue, path: string): string[] {
    if (Array.isArray(value)) {
        const sub = value.flatMap((v, i) =>
            collectCollapsiblePaths(v, `${path}[${i}]`)
        );
        return [path, ...sub];
    }
    if (value !== null && typeof value === "object") {
        const sub = Object.entries(value).flatMap(([k, v]) =>
            collectCollapsiblePaths(v, `${path}.${k}`)
        );
        return [path, ...sub];
    }
    return [];
}

function previewObject(value: Record<string, JsonValue>, limit = 3): string {
    const keys = Object.keys(value).slice(0, limit);
    return `{ ${keys.join(", ")}${Object.keys(value).length > limit ? ", …" : ""} }`;
}

function previewArray(value: JsonValue[], limit = 3): string {
    const len = value.length;
    if (len === 0) return "[]";
    return `[${len} item${len !== 1 ? "s" : ""}]`;
}

// ── Value colouring ────────────────────────────────────────────────────────────

function StringValue({ v }: { v: string }) {
    return <span className="text-emerald-600 dark:text-emerald-400">&quot;{v}&quot;</span>;
}
function NumberValue({ v }: { v: number }) {
    return <span className="text-sky-600 dark:text-sky-400">{String(v)}</span>;
}
function BooleanValue({ v }: { v: boolean }) {
    return <span className="text-amber-600 dark:text-amber-400">{String(v)}</span>;
}
function NullValue() {
    return <span className="text-slate-400 dark:text-slate-500">null</span>;
}

// ── Expandable node ────────────────────────────────────────────────────────────

function JsonNode({ value, path, collapsed, onToggle, depth = 0, keyName }: NodeProps) {
    const indent = depth * 16;
    const isCollapsed = collapsed.has(path);

    // Primitive
    if (typeof value === "string") {
        return (
            <div style={{ paddingLeft: indent }} className="flex items-baseline gap-1 leading-relaxed">
                {keyName !== undefined && (
                    <span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                )}
                {keyName !== undefined && <span className="text-muted-foreground">:</span>}
                <StringValue v={value} />
            </div>
        );
    }
    if (typeof value === "number") {
        return (
            <div style={{ paddingLeft: indent }} className="flex items-baseline gap-1 leading-relaxed">
                {keyName !== undefined && (
                    <span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                )}
                {keyName !== undefined && <span className="text-muted-foreground">:</span>}
                <NumberValue v={value} />
            </div>
        );
    }
    if (typeof value === "boolean") {
        return (
            <div style={{ paddingLeft: indent }} className="flex items-baseline gap-1 leading-relaxed">
                {keyName !== undefined && (
                    <span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                )}
                {keyName !== undefined && <span className="text-muted-foreground">:</span>}
                <BooleanValue v={value} />
            </div>
        );
    }
    if (value === null) {
        return (
            <div style={{ paddingLeft: indent }} className="flex items-baseline gap-1 leading-relaxed">
                {keyName !== undefined && (
                    <span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                )}
                {keyName !== undefined && <span className="text-muted-foreground">:</span>}
                <NullValue />
            </div>
        );
    }

    // Array
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return (
                <div style={{ paddingLeft: indent }} className="flex items-baseline gap-1 leading-relaxed">
                    {keyName !== undefined && (
                        <><span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                            <span className="text-muted-foreground">:</span></>
                    )}
                    <span className="text-muted-foreground">[]</span>
                </div>
            );
        }
        return (
            <div style={{ paddingLeft: indent }}>
                <div
                    className="flex items-center gap-0.5 cursor-pointer select-none hover:text-foreground group leading-relaxed"
                    onClick={() => onToggle(path)}
                >
                    {keyName !== undefined && (
                        <><span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                            <span className="text-muted-foreground mr-1">:</span></>
                    )}
                    <span className="text-muted-foreground/70 group-hover:text-muted-foreground w-4 h-4 inline-flex items-center justify-center">
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </span>
                    <span className="text-muted-foreground font-medium">[</span>
                    {isCollapsed && (
                        <span className="italic text-muted-foreground text-xs ml-1">{previewArray(value)}</span>
                    )}
                    {isCollapsed && <span className="text-muted-foreground font-medium ml-1">]</span>}
                </div>
                {!isCollapsed && (
                    <>
                        {value.map((item, i) => (
                            <JsonNode
                                key={i}
                                value={item}
                                path={`${path}[${i}]`}
                                collapsed={collapsed}
                                onToggle={onToggle}
                                depth={depth + 1}
                                keyName={undefined}
                            />
                        ))}
                        <div style={{ paddingLeft: 0 }} className="text-muted-foreground font-medium leading-relaxed">]</div>
                    </>
                )}
            </div>
        );
    }

    // Object
    const entries = Object.entries(value as Record<string, JsonValue>);
    if (entries.length === 0) {
        return (
            <div style={{ paddingLeft: indent }} className="flex items-baseline gap-1 leading-relaxed">
                {keyName !== undefined && (
                    <><span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                        <span className="text-muted-foreground">:</span></>
                )}
                <span className="text-muted-foreground">{"{}"}</span>
            </div>
        );
    }
    return (
        <div style={{ paddingLeft: indent }}>
            <div
                className="flex items-center gap-0.5 cursor-pointer select-none hover:text-foreground group leading-relaxed"
                onClick={() => onToggle(path)}
            >
                {keyName !== undefined && (
                    <><span className="text-violet-600 dark:text-violet-400">&quot;{keyName}&quot;</span>
                        <span className="text-muted-foreground mr-1">:</span></>
                )}
                <span className="text-muted-foreground/70 group-hover:text-muted-foreground w-4 h-4 inline-flex items-center justify-center">
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
                <span className="text-muted-foreground font-medium">{"{"}</span>
                {isCollapsed && (
                    <span className="italic text-muted-foreground text-xs ml-1">
                        {previewObject(value as Record<string, JsonValue>)}
                    </span>
                )}
                {isCollapsed && <span className="text-muted-foreground font-medium ml-1">{"}"}</span>}
            </div>
            {!isCollapsed && (
                <>
                    {entries.map(([k, v], i) => (
                        <JsonNode
                            key={k}
                            value={v}
                            path={`${path}.${k}`}
                            collapsed={collapsed}
                            onToggle={onToggle}
                            depth={depth + 1}
                            keyName={k}
                        />
                    ))}
                    <div className="text-muted-foreground font-medium leading-relaxed">{"}"}</div>
                </>
            )}
        </div>
    );
}

// ── Public component ───────────────────────────────────────────────────────────

export function JsonTreeView({ json }: { json: string }) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    let parsed: JsonValue;
    try {
        parsed = JSON.parse(json);
    } catch {
        return (
            <div className="p-3 text-sm text-red-500 font-mono">
                Invalid JSON — cannot render tree view
            </div>
        );
    }

    const onToggle = useCallback((path: string) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const collapseAll = () => {
        setCollapsed(new Set(collectCollapsiblePaths(parsed, "root")));
    };

    const expandAll = () => setCollapsed(new Set());

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 text-xs flex-shrink-0">
                <span className="text-muted-foreground">Tree View</span>
                <div className="ml-auto flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={expandAll}>
                        Expand All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={collapseAll}>
                        Collapse All
                    </Button>
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-auto p-3 font-mono text-sm leading-relaxed">
                <JsonNode
                    value={parsed}
                    path="root"
                    collapsed={collapsed}
                    onToggle={onToggle}
                    depth={0}
                />
            </div>
        </div>
    );
}
