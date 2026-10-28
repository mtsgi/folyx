<script setup lang="ts">
import { computed } from "vue";
import { micromark } from "micromark";

const props = defineProps<{ title: string; body: string }>();
const html = computed(() =>
  micromark(props.body, {
    allowDangerousHtml: false,
    allowDangerousProtocol: false,
  }),
);
</script>

<template>
  <article
    class="markdown"
    aria-label="Markdown preview"
  >
    <h1>{{ title.trim() || "Untitled" }}</h1>
    <!-- Only micromark output with raw HTML and dangerous protocols disabled. -->
    <div v-html="html" />
  </article>
</template>
