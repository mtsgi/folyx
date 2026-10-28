<script setup lang="ts">
import type { Note } from "./notes.ts";

defineProps<{ notes: readonly Note[]; selectedId: string }>();
defineEmits<{ select: [id: string] }>();
</script>

<template>
  <nav aria-label="Notes">
    <ul class="note-list">
      <li
        v-for="note in notes"
        :key="note.id"
      >
        <button
          type="button"
          :aria-current="note.id === selectedId ? 'true' : undefined"
          @click="$emit('select', note.id)"
        >
          {{ note.title.trim() || "Untitled" }}
        </button>
      </li>
    </ul>
  </nav>
</template>
