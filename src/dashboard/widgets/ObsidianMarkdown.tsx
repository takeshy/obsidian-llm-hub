import { useEffect, useRef, type MouseEvent } from "react";
import { Component, MarkdownRenderer, type App } from "obsidian";

/**
 * Render arbitrary Obsidian markdown (including `![[embeds]]` such as `.base`
 * views and note embeds) into a managed container. A fresh `Component` owns the
 * render's child lifecycles and is unloaded on unmount / re-render.
 */
export default function ObsidianMarkdown({
  app,
  markdown,
  sourcePath,
  className,
  onInternalLinkClick,
}: {
  app: App;
  markdown: string;
  sourcePath: string;
  className?: string;
  onInternalLinkClick?: (href: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const component = new Component();
    component.load();
    void MarkdownRenderer.render(app, markdown, el, sourcePath, component);
    return () => {
      component.unload();
      el.innerHTML = "";
    };
  }, [app, markdown, sourcePath]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a.internal-link");
    if (!(link instanceof HTMLAnchorElement) || !event.currentTarget.contains(link)) return;
    const href = link.dataset.href || link.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    event.stopPropagation();
    if (onInternalLinkClick) {
      onInternalLinkClick(href);
      return;
    }
    void app.workspace.openLinkText(href, sourcePath, true);
  };

  return <div className={className} onClick={handleClick}><div ref={ref} /></div>;
}
