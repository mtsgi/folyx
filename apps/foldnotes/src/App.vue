<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { CSSProperties } from "vue";
import type { FolyxProvider, Rect } from "@folyx/core";
import { useFolyx } from "@folyx/vue";
import NoteList from "./NoteList.vue";
import MarkdownPreview from "./MarkdownPreview.vue";
import { createNote, loadNotebook, saveNotebook } from "./notes.ts";
import type { Note } from "./notes.ts";

const props = defineProps<{ provider?: FolyxProvider }>();
const { snapshot } = useFolyx({ provider: props.provider });
const horizontal = computed(() => {
  const { layout, segments } = snapshot.value;
  return layout === "horizontal" && segments.items.length === 2 && segments.source !== "fallback"
    ? segments.items
    : null;
});

const notes = ref<Note[]>([]);
const selectedId = ref("");
const current = computed(() => notes.value.find((note) => note.id === selectedId.value));
const view = ref<"edit" | "preview">("edit");
const notesOpen = ref(false);
const ready = ref(false);
const storageError = ref("");
const titleInput = ref<HTMLInputElement>();
const notesButton = ref<HTMLButtonElement>();
let storage: Storage | undefined;

function persist() {
  if (!ready.value || !storage) return;

  try {
    saveNotebook(storage, { notes: notes.value, selectedId: selectedId.value });
    storageError.value = "";
  } catch {
    storageError.value = "Could not save. Your changes are still in this tab.";
  }
}

onMounted(() => {
  try {
    storage = window.localStorage;
    const saved = loadNotebook(storage);
    notes.value = saved.notes;
    selectedId.value = saved.selectedId;
  } catch {
    // Keep unreadable stored data intact; allow editing in memory.
    storage = undefined;
    const note = createNote();
    notes.value = [note];
    selectedId.value = note.id;
    storageError.value = "Could not read saved notes. Changes will stay in this tab.";
  }

  ready.value = true;
  persist();
});

watch([notes, selectedId], persist, { deep: true, flush: "sync" });

function closeNotes() {
  if (!notesOpen.value) return;
  notesOpen.value = false;
  notesButton.value?.focus();
}

function selectNote(id: string) {
  selectedId.value = id;
  closeNotes();
}

async function addNote() {
  const note = createNote();
  notes.value.unshift(note);
  selectedId.value = note.id;
  notesOpen.value = false;
  view.value = "edit";
  await nextTick();
  titleInput.value?.focus();
}

function segmentStyle(rect: Rect | undefined): CSSProperties | undefined {
  if (!rect) return undefined;
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}
</script>

<template>
  <main
    :class="{ horizontal }"
    @keydown.esc="closeNotes"
  >
    <section
      class="workspace"
      :style="segmentStyle(horizontal?.[0])"
      aria-label="Editor segment"
    >
      <header class="toolbar">
        <strong>FoldNotes</strong>
        <button
          ref="notesButton"
          class="notes-toggle"
          type="button"
          :aria-expanded="notesOpen"
          aria-controls="notes"
          @click="notesOpen = !notesOpen"
        >
          Notes
        </button>
        <button
          type="button"
          :disabled="!ready"
          @click="addNote"
        >
          New note
        </button>
      </header>
      <p
        class="save-status"
        role="status"
      >
        {{ storageError || (ready ? "Saved on this device" : "Loading notes…") }}
      </p>
      <div class="workspace-content">
        <aside
          id="notes"
          class="notes"
          :class="{ open: notesOpen }"
        >
          <NoteList
            :notes="notes"
            :selected-id="selectedId"
            @select="selectNote"
          />
        </aside>
        <div class="document">
          <nav
            v-if="!horizontal"
            class="tabs"
            aria-label="Document view"
          >
            <button
              type="button"
              :aria-pressed="view === 'edit'"
              @click="view = 'edit'"
            >
              Edit
            </button>
            <button
              type="button"
              :aria-pressed="view === 'preview'"
              @click="view = 'preview'"
            >
              Preview
            </button>
          </nav>
          <template v-if="current">
            <div
              v-show="horizontal || view === 'edit'"
              class="editor"
            >
              <label for="note-title">Title</label>
              <input
                id="note-title"
                ref="titleInput"
                v-model="current.title"
                placeholder="Untitled"
              />
              <label for="note-body">Markdown</label>
              <textarea
                id="note-body"
                v-model="current.body"
                spellcheck="false"
              />
            </div>
            <MarkdownPreview
              v-if="!horizontal && view === 'preview'"
              :title="current.title"
              :body="current.body"
            />
          </template>
        </div>
      </div>
    </section>
    <section
      v-if="horizontal"
      class="preview-pane"
      :style="segmentStyle(horizontal[1])"
      aria-label="Preview segment"
    >
      <header class="toolbar"><strong>Preview</strong></header>
      <MarkdownPreview
        v-if="current"
        :title="current.title"
        :body="current.body"
      />
    </section>
  </main>
</template>
