import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock3, FileText, MessageCircle, Plus, X } from "lucide-react";
import { Notice, TFile } from "obsidian";
import { t } from "src/i18n";
import type { WidgetContext } from "../types";
import { ensureVaultFolder } from "../dashboardFile";
import { moveCalendarEvent } from "../timelineEvents";
import ObsidianMarkdown from "./ObsidianMarkdown";
import { TimelineLinkPreviewModal } from "./TimelineLinkPreviewModal";

interface CalendarConfig {
  timelineName?: string;
  showCreatedFiles?: boolean;
}

interface CalendarPost {
  id: string;
  createdAt: string;
  content: string;
  isEvent: boolean;
  eventDate: string;
}

const TIMELINE_ROOT = "Dashboards/Timeline";
const POST_SEPARATOR_RE = /^\s*---\s*\r?\n(?=(?:<!--\s*timeline-post:|\d{4}-\d{2}-\d{2}T))/m;
const POST_MARKER_RE = /<!--\s*timeline-post:\s*([^>]+?)\s*-->/;
const ISO_DATE_LINE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const EVENT_MARKER_RE = /<!--\s*calendar-event:\s*\d{4}-\d{2}-\d{2}\s*-->/i;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sanitizeName(value: string): string {
  return value.trim().replace(/\.md$/i, "").replace(/[\\/:*?"<>|#[\]\n\r\t]+/g, "-")
    .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "Timeline";
}

function parsePosts(content: string): CalendarPost[] {
  return content.split(POST_SEPARATOR_RE).flatMap((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const marker = trimmed.match(POST_MARKER_RE);
    const lines = trimmed.replace(POST_MARKER_RE, "").trim().split(/\r?\n/);
    const createdAt = marker?.[1]?.trim() || (ISO_DATE_LINE_RE.test(lines[0]?.trim() ?? "") ? lines[0].trim() : "");
    let bodyStart = ISO_DATE_LINE_RE.test(lines[0]?.trim() ?? "") ? 1 : 0;
    const idLine = lines[bodyStart]?.match(/^id:\s*(.+?)\s*$/i);
    if (idLine) bodyStart += 1;
    if (/^pinned:\s*(true|false)\s*$/i.test(lines[bodyStart]?.trim() ?? "")) bodyStart += 1;
    const body = lines.slice(bodyStart).join("\n").trim();
    const eventMatch = body.match(EVENT_MARKER_RE);
    return body ? [{
      id: idLine?.[1] ?? `${createdAt}-${index}`,
      createdAt,
      content: body,
      isEvent: eventMatch !== null,
      eventDate: eventMatch?.[0].match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "",
    }] : [];
  });
}

function eventBlock(date: string, time: string, content: string): string {
  const now = new Date();
  const id = `calendar-event-${now.getTime().toString(36)}`;
  const title = `${t("dashboard.calendarEvent")} · ${date}${time ? ` ${time}` : ""}`;
  const callout = content.trim().split(/\r?\n/).map((line) => `> ${line}`).join("\n");
  return `${now.toISOString()}\nid: ${id}\n\n<!-- calendar-event: ${date} -->\n> [!calendar] ${title}\n${callout}`;
}

function sameMonth(date: Date, month: Date): boolean {
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
}

export default function CalendarWidget({ config: rawConfig, ctx }: { config?: unknown; ctx?: WidgetContext }) {
  const config = (rawConfig ?? {}) as CalendarConfig;
  const timelineName = sanitizeName(config.timelineName ?? "Timeline");
  const showCreatedFiles = config.showCreatedFiles !== false;
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [revision, setRevision] = useState(0);
  const [events, setEvents] = useState<CalendarPost[]>([]);
  const [timelinePosts, setTimelinePosts] = useState<CalendarPost[]>([]);
  const [postDays, setPostDays] = useState<Set<string>>(() => new Set());
  const [eventDays, setEventDays] = useState<Set<string>>(() => new Set());
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTime, setEventTime] = useState("");
  const [eventText, setEventText] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!ctx) return;
    const refs = [
      ctx.app.vault.on("create", refresh),
      ctx.app.vault.on("delete", refresh),
      ctx.app.vault.on("rename", refresh),
      ctx.app.vault.on("modify", refresh),
    ];
    return () => refs.forEach((ref) => ctx.app.vault.offref(ref));
  }, [ctx, refresh]);

  const filesByDay = useMemo(() => {
    const result = new Map<string, TFile[]>();
    if (!ctx || !showCreatedFiles) return result;
    const timelinePrefix = `${TIMELINE_ROOT}/${timelineName}/`;
    for (const file of ctx.app.vault.getFiles()) {
      if (file.path.startsWith(timelinePrefix)) continue;
      const key = dateKey(new Date(file.stat.ctime));
      const list = result.get(key) ?? [];
      list.push(file);
      result.set(key, list);
    }
    for (const list of result.values()) list.sort((a, b) => b.stat.ctime - a.stat.ctime);
    return result;
  }, [ctx, showCreatedFiles, timelineName, revision]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!ctx) {
        setEvents([]);
        setTimelinePosts([]);
        setPostDays(new Set());
        setEventDays(new Set());
        return;
      }
      const prefix = `${TIMELINE_ROOT}/${timelineName}/`;
      const files = ctx.app.vault.getMarkdownFiles().filter((file) =>
        file.path.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}\.md$/.test(file.path.slice(prefix.length)),
      );
      const loaded = (await Promise.all(files.map(async (file) => parsePosts(await ctx.app.vault.cachedRead(file))))).flat();
      if (!cancelled) {
        setEvents(loaded.filter((post) => post.isEvent && post.eventDate === selected).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setTimelinePosts(loaded.filter((post) => dateKey(new Date(post.createdAt)) === selected).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setPostDays(new Set(loaded.map((post) => dateKey(new Date(post.createdAt)))));
        setEventDays(new Set(loaded.filter((post) => post.isEvent).map((post) => post.eventDate).filter(Boolean)));
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [ctx, timelineName, selected, revision]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const selectedFiles = filesByDay.get(selected) ?? [];
  const today = dateKey(new Date());
  const locale = document.documentElement.lang || navigator.language;
  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(month);
  const selectedLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "short" })
    .format(new Date(`${selected}T00:00:00`));
  const weekdays = Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + day)));

  const selectDay = (day: Date) => {
    if (dateKey(day) !== selected) {
      setShowEventForm(false);
      setEventText("");
      setEventTime("");
      setEvents([]);
      setTimelinePosts([]);
    }
    setSelected(dateKey(day));
    setDetailOpen(true);
    if (!sameMonth(day, month)) setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  useEffect(() => {
    if (!detailOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detailOpen]);
  const goToday = () => {
    const now = new Date();
    setShowEventForm(false);
    setEventText("");
    setEventTime("");
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(dateKey(now));
  };
  const saveEvent = async () => {
    if (!ctx || !eventText.trim() || savingEvent) return;
    setSavingEvent(true);
    try {
      const dir = `${TIMELINE_ROOT}/${timelineName}`;
      await ensureVaultFolder(ctx.app.vault, dir);
      const path = `${dir}/${selected}.md`;
      const existing = ctx.app.vault.getAbstractFileByPath(path);
      const block = eventBlock(selected, eventTime, eventText);
      if (existing instanceof TFile) {
        const current = (await ctx.app.vault.read(existing)).trim();
        await ctx.app.vault.modify(existing, `${current}${current ? "\n\n---\n\n" : ""}${block}\n`);
      } else {
        await ctx.app.vault.create(path, `${block}\n`);
      }
      setEventText("");
      setEventTime("");
      setShowEventForm(false);
      refresh();
      new Notice(t("dashboard.calendarEventSaved"));
    } catch (error) {
      console.error("Calendar: failed to save event", error);
      new Notice(t("dashboard.calendarEventSaveError"));
    } finally {
      setSavingEvent(false);
    }
  };
  const changeEventDate = async (post: CalendarPost, nextDate: string) => {
    if (!ctx || !nextDate || nextDate === post.eventDate) return;
    try {
      if (await moveCalendarEvent(ctx.app.vault, timelineName, post.id, nextDate)) {
        refresh();
        new Notice(t("dashboard.calendarEventDateChanged"));
      }
    } catch (error) {
      console.error("Calendar: failed to move event", error);
      new Notice(t("dashboard.calendarEventSaveError"));
    }
  };
  const openInternalLink = (target: string) => {
    if (!ctx) return;
    setDetailOpen(false);
    new TimelineLinkPreviewModal(ctx.app, target, `${TIMELINE_ROOT}/${timelineName}/${selected}.md`).open();
  };
  const openCreatedFile = (file: TFile) => {
    if (!ctx) return;
    setDetailOpen(false);
    void ctx.app.workspace.getLeaf(true).openFile(file);
  };

  return <div className="llm-hub-db-calendar">
    <div className="llm-hub-db-calendar-heading">
      <div className="llm-hub-db-calendar-title"><CalendarDays size={17} /><span>{monthLabel}</span></div>
      <button type="button" className="llm-hub-db-calendar-today" onClick={goToday}>{t("dashboard.calendarToday")}</button>
    </div>
    <div className="llm-hub-db-calendar-nav">
      <button type="button" aria-label={t("dashboard.calendarPreviousMonth")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>
      <div className="llm-hub-db-calendar-legend"><span><i className="is-event" />{t("dashboard.calendarEvents")}</span><span><i className="is-file" />{t("dashboard.calendarFilesShort")}</span><span><i className="is-post" />Timeline</span></div>
      <button type="button" aria-label={t("dashboard.calendarNextMonth")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button>
    </div>
    <div className="llm-hub-db-calendar-grid">
      {weekdays.map((label, index) => <div className={`llm-hub-db-calendar-weekday is-${index}`} key={label}>{label}</div>)}
      {days.map((day, index) => {
        const key = dateKey(day);
        const fileCount = filesByDay.get(key)?.length ?? 0;
        return <button type="button" key={key} className={`llm-hub-db-calendar-day is-${index % 7}${sameMonth(day, month) ? "" : " is-outside"}${key === today ? " is-today" : ""}${key === selected ? " is-selected" : ""}`} onClick={() => selectDay(day)}>
          <span>{day.getDate()}</span>
          <span className="llm-hub-db-calendar-dots">{eventDays.has(key) && <i className="is-event" />}{fileCount > 0 && <i className="is-file" />}{postDays.has(key) && <i className="is-post" />}</span>
        </button>;
      })}
    </div>
    {detailOpen && createPortal(<div className="llm-hub-db-calendar-modal-backdrop" onMouseDown={() => setDetailOpen(false)}>
      <div className="llm-hub-db-calendar-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="llm-hub-db-calendar-modal-close" aria-label={t("common.close")} onClick={() => setDetailOpen(false)}><X size={18} /></button>
        <div className="llm-hub-db-calendar-detail">
      <div className="llm-hub-db-calendar-detail-heading"><h4>{selectedLabel}</h4><div><span>{events.length + timelinePosts.length + selectedFiles.length}</span><button type="button" title={t("dashboard.calendarAddEvent")} onClick={() => setShowEventForm((value) => !value)}>{showEventForm ? <X size={15} /> : <Plus size={15} />}{t("dashboard.calendarAddEvent")}</button></div></div>
      {showEventForm && <form className="llm-hub-db-calendar-event-form" onSubmit={(event) => { event.preventDefault(); void saveEvent(); }}>
        <div className="llm-hub-db-calendar-event-form-title"><span><CalendarPlus size={16} />{t("dashboard.calendarEventFormTitle")}</span><strong>{selected}</strong></div>
        <label className="llm-hub-db-calendar-event-time-field"><span>{t("dashboard.calendarEventTimeOptional")}</span><input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></label>
        <label className="llm-hub-db-calendar-event-content-field"><span>{t("dashboard.calendarEventContent")}</span><textarea value={eventText} onChange={(event) => setEventText(event.target.value)} placeholder={t("dashboard.calendarEventPlaceholder")} autoFocus /></label>
        <div className="llm-hub-db-calendar-event-form-actions"><button type="button" onClick={() => { setShowEventForm(false); setEventText(""); setEventTime(""); }}>{t("dashboard.cancel")}</button><button type="submit" className="mod-cta" disabled={!eventText.trim() || savingEvent}>{savingEvent ? t("dashboard.calendarEventSaving") : t("dashboard.calendarEventSave")}</button></div>
      </form>}
      {events.length > 0 && ctx && <section className="llm-hub-db-calendar-events"><h5><Clock3 size={14} />{t("dashboard.calendarEvents")} <span>{events.length}</span></h5>{events.map((event) => <article key={event.id}><div className="llm-hub-db-calendar-event-date"><span>{t("dashboard.calendarEventDate")}</span><input type="date" value={event.eventDate} onChange={(change) => void changeEventDate(event, change.target.value)} /></div><ObsidianMarkdown app={ctx.app} markdown={event.content} sourcePath={`${TIMELINE_ROOT}/${timelineName}/${selected}.md`} onInternalLinkClick={openInternalLink} /></article>)}</section>}
      {events.length === 0 && timelinePosts.length === 0 && selectedFiles.length === 0 && !showEventForm ? <div className="llm-hub-db-widget-empty">{t("dashboard.calendarEmpty")}</div> : <>
        {selectedFiles.length > 0 && <section><h5><FileText size={14} />{t("dashboard.calendarCreatedFiles")} <span>{selectedFiles.length}</span></h5>{selectedFiles.map((file) => <button type="button" className="llm-hub-db-calendar-file" key={file.path} onClick={() => openCreatedFile(file)}><FileText size={14} /><span>{file.basename}</span><small>{file.parent?.path}</small></button>)}</section>}
        {timelinePosts.length > 0 && ctx && <section><h5><MessageCircle size={14} />{t("dashboard.calendarTimeline")} <span>{timelinePosts.length}</span></h5>{timelinePosts.map((post) => <article key={post.id}><ObsidianMarkdown app={ctx.app} markdown={post.content} sourcePath={`${TIMELINE_ROOT}/${timelineName}/${selected}.md`} onInternalLinkClick={openInternalLink} /></article>)}</section>}
      </>}
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
