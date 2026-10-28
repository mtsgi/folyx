export interface Note {
  id: string;
  title: string;
  body: string;
}

export interface Notebook {
  notes: Note[];
  selectedId: string;
}

export const storageKey = "foldnotes.notebook.v1";

export function createNote(title = "", body = ""): Note {
  return { id: crypto.randomUUID(), title, body };
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;

  return (
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    "title" in value &&
    typeof value.title === "string" &&
    "body" in value &&
    typeof value.body === "string"
  );
}

export function loadNotebook(storage: Storage): Notebook {
  const raw = storage.getItem(storageKey);

  if (raw === null) {
    const note = createNote(
      "Welcome to FoldNotes",
      `## A little space to think

Write in **Markdown**, then open Preview to read your note.

- Create a note with New note.
- Your changes are saved on this device.
- On two side-by-side viewport segments, write on the left and read on the right.

### Try some code

\`\`\`ts
const idea = "Keep it simple";
\`\`\`

No account needed. Just your notes.
`,
    );

    return { notes: [note], selectedId: note.id };
  }

  const saved: unknown = JSON.parse(raw);

  if (
    !saved ||
    typeof saved !== "object" ||
    !("notes" in saved) ||
    !Array.isArray(saved.notes) ||
    !saved.notes.length ||
    !saved.notes.every(isNote) ||
    new Set(saved.notes.map((note) => note.id)).size !== saved.notes.length
  )
    throw new Error("Invalid saved notebook");

  const selectedId =
    "selectedId" in saved &&
    typeof saved.selectedId === "string" &&
    saved.notes.some((note) => note.id === saved.selectedId)
      ? saved.selectedId
      : saved.notes[0]!.id;

  return { notes: saved.notes, selectedId };
}

export function saveNotebook(storage: Storage, notebook: Notebook): void {
  storage.setItem(storageKey, JSON.stringify(notebook));
}
