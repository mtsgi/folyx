<script setup lang="ts">
import { ref } from "vue";
import Workspace from "./components/Workspace.vue";

/** A mode change remounts the keyed workspace and releases its scoped subscriptions. */
const mode = ref<"mock" | "browser">("mock");

/** Published docs are a sibling of FoldLab; development uses the separate docs server. */
const docsUrl = import.meta.env.BASE_URL.endsWith("/foldlab/")
  ? "../"
  : "http://localhost:4321/folyx/";
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <a
        class="brand"
        href="./"
        aria-label="FoldLab home"
      >
        FoldLab
      </a>

      <nav
        class="mode-nav"
        aria-label="Workspace"
      >
        <button
          class="nav-item"
          :class="{ selected: mode === 'mock' }"
          :aria-pressed="mode === 'mock'"
          @click="mode = 'mock'"
        >
          Simulator
        </button>

        <button
          class="nav-item"
          :class="{ selected: mode === 'browser' }"
          :aria-pressed="mode === 'browser'"
          @click="mode = 'browser'"
        >
          Device inspector
        </button>
      </nav>

      <a
        class="docs-link"
        :href="docsUrl"
      >
        Documentation
      </a>
    </header>

    <Workspace
      :key="mode"
      :mode="mode"
    />
  </div>
</template>
