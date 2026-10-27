# @folyx/vue

`useFolyx()` brings Folyx state into Vue 3.5 and newer. It connects Core snapshots to readonly refs and takes care of subscribing and cleaning up with the component lifecycle. Vue and Core stay external dependencies.

You can call it from component setup:

```vue
<script setup lang="ts">
import { useFolyx } from "@folyx/vue";
const { posture, layout, segments, snapshot } = useFolyx();
</script>
<template>
  <p>{{ posture }} / {{ layout }} / {{ segments.length }} regions</p>
  <p>{{ snapshot.availability.segments }}</p>
</template>
```

The returned refs are posture, layout, segments, viewport, gaps, and the full snapshot. To use Mock or another Provider, pass `useFolyx({ provider })`. To share an existing instance, use `useFolyx({ folyx })`. A call can take either option, but not both.

Server rendering and the first client render begin with the same unknown state, even when a shared instance already has observations. During SSR, the composable doesn't read from or subscribe to that instance. On mount, it subscribes and receives the latest value straight away.

When the component's scope ends, it releases only its own subscription. Other components and the caller can keep using the shared instance, and a supplied Provider stays owned by the caller. For SSR, create shared Core instances per request so visitors' state stays separate. There is no global singleton or extra destroy method to manage.

The repository's documentation has more examples of sharing and SSR behavior. The package is MIT licensed.
