// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { createApp, createSSRApp, nextTick } from "vue";
import type { App as VueApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createFolyx, createMockProvider } from "@folyx/core";
import App from "../src/App.vue";
import { storageKey } from "../src/notes.ts";

const apps: VueApp[] = [];
const viewport = { width: 1000, height: 700 };
const whole = { x: 0, y: 0, ...viewport };
const left = { x: 16, y: 20, width: 300, height: 640 };
const right = { x: 348, y: 20, width: 632, height: 640 };

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

function mockProvider() {
  return createMockProvider({ posture: "continuous", viewport, segments: [whole] });
}

async function mount(provider = mockProvider()) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(App, { provider });
  apps.push(app);
  app.mount(host);
  await nextTick();
  return { host, app, provider };
}

function button(host: HTMLElement, text: string) {
  const match = [...host.querySelectorAll("button")].find((el) => el.textContent?.trim() === text);
  if (!match) throw new Error(`Missing button: ${text}`);
  return match;
}

async function edit(host: HTMLElement, selector: string, value: string) {
  const field = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

test("single layout creates, edits, selects, and previews notes", async () => {
  const { host } = await mount();
  expect(host.querySelector("main.horizontal")).toBeNull();
  expect(host.querySelector(".note-list")!.textContent).toContain("Welcome to FoldNotes");

  button(host, "New note").click();
  await nextTick();
  expect(document.activeElement).toBe(host.querySelector("#note-title"));
  expect(host.querySelector(".note-list")!.textContent).toContain("Untitled");

  await edit(host, "#note-title", "Shopping");
  await edit(host, "#note-body", "## Today\n\n- **Coffee**\n- Bread");
  button(host, "Preview").click();
  await nextTick();
  expect(host.querySelector(".markdown h1")!.textContent).toBe("Shopping");
  expect(host.querySelector(".markdown h2")!.textContent).toBe("Today");
  expect(host.querySelectorAll(".markdown li")).toHaveLength(2);
  expect(host.querySelector(".markdown strong")!.textContent).toBe("Coffee");

  button(host, "Notes").click();
  await nextTick();
  button(host, "Welcome to FoldNotes").click();
  await nextTick();
  expect(host.querySelector(".notes")!.classList.contains("open")).toBe(false);
  expect(host.querySelector(".markdown h1")!.textContent).toBe("Welcome to FoldNotes");
  button(host, "Shopping").click();
  button(host, "Edit").click();
  await nextTick();
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toContain("**Coffee**");
});

test("continuous posture with two segments positions editor and preview using all four coordinates", async () => {
  const provider = mockProvider();
  // Core sorts the reversed observations into left-to-right order.
  provider.set({ segments: [right, left] });
  const subscribe = vi.spyOn(provider, "subscribe");
  const { host, app } = await mount(provider);

  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(host.querySelector("main.horizontal")).not.toBeNull();
  const editor = host.querySelector<HTMLElement>(".workspace")!;
  const preview = host.querySelector<HTMLElement>(".preview-pane")!;
  expect([editor.style.left, editor.style.top, editor.style.width, editor.style.height]).toEqual([
    "16px",
    "20px",
    "300px",
    "640px",
  ]);
  expect([
    preview.style.left,
    preview.style.top,
    preview.style.width,
    preview.style.height,
  ]).toEqual(["348px", "20px", "632px", "640px"]);
  expect(host.querySelector(".tabs")).toBeNull();
  await edit(host, "#note-body", "**Live preview**");
  expect(preview.querySelector("strong")!.textContent).toBe("Preview");
  expect(preview.querySelector(".markdown strong")!.textContent).toBe("Live preview");

  app.unmount();
  apps.splice(apps.indexOf(app), 1);
  provider.set({ segments: [whole] });
  expect(host.innerHTML).toBe("");
});

test("switching between single, horizontal, and fallback preserves selection, draft, and the single view", async () => {
  const { host, provider } = await mount();
  button(host, "New note").click();
  await nextTick();
  await edit(host, "#note-title", "Keep this note");
  await edit(host, "#note-body", "Unsaved typing survives layout changes.");
  const id = JSON.parse(window.localStorage.getItem(storageKey)!).selectedId;
  button(host, "Preview").click();
  await nextTick();

  provider.set({ posture: "folded", segments: [left, right] });
  await nextTick();
  expect(host.querySelector("main.horizontal")).not.toBeNull();
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe(
    "Unsaved typing survives layout changes.",
  );
  await edit(host, "#note-body", "Edited while folded.");

  // Available API, but coordinates cannot safely be mapped (for example during zoom).
  provider.set({ segments: null, availability: { segments: "available" } });
  expect(createFolyx({ provider }).getSnapshot().segments.source).toBe("fallback");
  await nextTick();
  expect(host.querySelector("main.horizontal")).toBeNull();
  expect(host.querySelector<HTMLElement>(".workspace")!.getAttribute("style") || "").toBe("");
  expect(host.querySelector(".markdown")!.textContent).toContain("Edited while folded.");
  expect(JSON.parse(window.localStorage.getItem(storageKey)!).selectedId).toBe(id);

  provider.set({ segments: [whole] });
  await nextTick();
  button(host, "Edit").click();
  await nextTick();
  expect(host.querySelector<HTMLInputElement>("#note-title")!.value).toBe("Keep this note");
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe("Edited while folded.");
});

test("vertical, complex, three horizontal segments, and unknown geometry stay in single layout", async () => {
  const { host, provider } = await mount();
  const cases = [
    [
      { x: 0, y: 0, width: 1000, height: 300 },
      { x: 0, y: 350, width: 1000, height: 350 },
    ],
    [left, { ...right, y: 40 }],
    [0, 340, 680].map((x) => ({ x, y: 0, width: 300, height: 700 })),
  ];

  for (const segments of cases) {
    provider.set({ segments });
    await nextTick();
    expect(host.querySelector("main.horizontal")).toBeNull();
    expect(host.querySelector("#note-body")).not.toBeNull();
  }

  provider.set({ viewport: null, segments: null });
  await nextTick();
  expect(host.querySelector("main.horizontal")).toBeNull();
  await edit(host, "#note-body", "Works without geometry.");
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe(
    "Works without geometry.",
  );
});

test("autosaves and restores the selected note without overwriting it with initial empty state", async () => {
  const first = await mount();
  button(first.host, "New note").click();
  await nextTick();
  await edit(first.host, "#note-title", "Restored");
  await edit(first.host, "#note-body", "Remember **this**.");
  const saved = JSON.parse(window.localStorage.getItem(storageKey)!);
  first.app.unmount();
  apps.splice(apps.indexOf(first.app), 1);

  const write = vi.spyOn(window.localStorage, "setItem");
  const { host } = await mount();
  expect(host.querySelector<HTMLInputElement>("#note-title")!.value).toBe("Restored");
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe("Remember **this**.");
  expect(host.querySelectorAll(".note-list button")).toHaveLength(2);
  expect(JSON.parse(window.localStorage.getItem(storageKey)!)).toEqual(saved);
  for (const [, value] of write.mock.calls) expect(JSON.parse(value)).toEqual(saved);
});

test("a missing selected note safely selects an existing saved note", async () => {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      notes: [{ id: "existing", title: "Existing", body: "Saved body" }],
      selectedId: "missing",
    }),
  );
  const { host } = await mount();
  expect(host.querySelector<HTMLInputElement>("#note-title")!.value).toBe("Existing");
  expect(host.querySelectorAll(".note-list button")).toHaveLength(1);
});

test("write failures retain edits and recover when storage becomes writable", async () => {
  const write = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  const { host } = await mount();
  await edit(host, "#note-body", "Still editable");
  expect(host.querySelector("[role=status]")!.textContent).toContain("Could not save");
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe("Still editable");

  write.mockRestore();
  await edit(host, "#note-body", "Saving works again");
  expect(host.querySelector("[role=status]")!.textContent).toContain("Saved on this device");
  expect(window.localStorage.getItem(storageKey)).toContain("Saving works again");
});

test.each(["{broken", '{"notes":[{"id":"x","title":1,"body":"bad"}]}'])(
  "unreadable saved data is preserved while in-memory editing stays available: %s",
  async (raw) => {
    window.localStorage.setItem(storageKey, raw);
    const { host } = await mount();
    await edit(host, "#note-body", "In-memory draft");
    expect(host.querySelector("[role=status]")!.textContent).toContain(
      "Could not read saved notes",
    );
    expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe("In-memory draft");
    expect(window.localStorage.getItem(storageKey)).toBe(raw);
  },
);

test("blocked localStorage does not prevent creating or editing notes", async () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  const { host } = await mount();
  button(host, "New note").click();
  await nextTick();
  await edit(host, "#note-body", "Private session draft");
  expect(host.querySelector<HTMLTextAreaElement>("#note-body")!.value).toBe(
    "Private session draft",
  );
  expect(host.querySelector("[role=status]")!.textContent).toContain(
    "Changes will stay in this tab",
  );
});

test("Markdown supports basic syntax while escaping HTML and removing unsafe URLs", async () => {
  const { host } = await mount();
  await edit(host, "#note-title", '<img src=x onerror="alert(1)">');
  await edit(
    host,
    "#note-body",
    [
      "# Heading\n\n**Bold** and *italic*.\n\n- One\n- Two",
      '```html\n<script>alert("code")</script>\n```',
      '<script>alert("raw")</script>',
      '<img src=x onerror="alert(1)">',
      '<svg onload="alert(1)"></svg>',
      "[Unsafe](javascript:alert%281%29)",
      "[Encoded](jav&#x61;script:alert%281%29)",
      "![Unsafe image](data:image/svg+xml;base64,PHN2Zy8+)",
      "[Safe](https://example.com)",
    ].join("\n\n"),
  );
  button(host, "Preview").click();
  await nextTick();

  const preview = host.querySelector(".markdown")!;
  expect(preview.querySelector("h1")!.textContent).toContain("<img");
  expect(preview.querySelector("strong")!.textContent).toBe("Bold");
  expect(preview.querySelector("em")!.textContent).toBe("italic");
  expect(preview.querySelectorAll("li")).toHaveLength(2);
  expect(preview.querySelector("pre code")!.textContent).toContain(
    '<script>alert("code")</script>',
  );
  expect(preview.querySelector("script, svg, iframe, style, [onerror], [onload]")).toBeNull();
  for (const element of preview.querySelectorAll("[href], [src]")) {
    expect(element.getAttribute("href") || element.getAttribute("src") || "").not.toMatch(
      /^(javascript|vbscript|data):/i,
    );
  }
  expect(preview.querySelector('a[href="https://example.com"]')).not.toBeNull();
});

test("Escape closes the notes list and returns focus to its button", async () => {
  const { host } = await mount();
  button(host, "Notes").click();
  await nextTick();
  button(host, "Welcome to FoldNotes").focus();
  host
    .querySelector("main")!
    .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await nextTick();
  expect(button(host, "Notes").getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(button(host, "Notes"));
});

test.each([320, 390, 1280])("responsive CSS keeps navigation usable at %ipx", async (width) => {
  const { host, provider } = await mount();
  const dom = new Window({ width, height: 800 });
  const style = dom.document.createElement("style");
  style.textContent = readFileSync(`${import.meta.dirname}/../src/style.css`, "utf8");
  dom.document.head.append(style);

  // Evaluate real app markup and CSS at a fresh viewport; happy-dom does not measure boxes.
  function css(selector: string) {
    return dom.getComputedStyle(dom.document.querySelector(selector)!);
  }

  try {
    dom.document.body.innerHTML = host.innerHTML;
    expect(css(".notes").display).toBe(width >= 768 ? "block" : "none");
    expect(css(".notes-toggle").display === "none").toBe(width >= 768);
    expect(css(".document").display).toBe("flex");

    if (width < 768) {
      button(host, "Notes").click();
      await nextTick();
      dom.document.body.innerHTML = host.innerHTML;
      expect(css(".notes").display).toBe("block");
      expect(css(".document").display).toBe("none");
      button(host, "Welcome to FoldNotes").click();
      await nextTick();
    }

    provider.set({ segments: [left, right] });
    await nextTick();
    dom.document.body.innerHTML = host.innerHTML;
    expect(css(".notes").display).toBe("none");
    expect(css(".notes-toggle").display).not.toBe("none");
    expect(css(".workspace").position).toBe("fixed");
    expect(css(".preview-pane").position).toBe("fixed");
    expect(css(".preview-pane .markdown").overflow).toBe("auto");
  } finally {
    await dom.happyDOM.close();
  }
});

test("SSR uses single layout without accessing storage or subscribing to the provider", async () => {
  const provider = mockProvider();
  provider.set({ segments: [left, right] });
  const subscribe = vi.spyOn(provider, "subscribe");
  const storage = vi.spyOn(window.localStorage, "getItem");
  const html = await renderToString(createSSRApp(App, { provider }));
  expect(html).toContain("FoldNotes");
  expect(html).toContain("Loading notes");
  expect(html).not.toContain('class="preview-pane"');
  expect(subscribe).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
});
