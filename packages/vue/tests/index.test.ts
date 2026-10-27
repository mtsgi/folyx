// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from "vite-plus/test";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  isReadonly,
  nextTick,
  onBeforeMount,
  ref,
} from "vue";
import { renderToString } from "@vue/server-renderer";
import { createFolyx, createMockProvider } from "@folyx/core";
import { useFolyx } from "../src/index.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const viewport = { width: 900, height: 600 };

/** Attach a component host to happy-dom; afterEach clears the document body. */
function host() {
  const el = document.createElement("div");
  document.body.append(el);

  return el;
}

test("SSR never reads or subscribes to a shared instance; hydration starts with the same unknown state", async () => {
  const mock = createMockProvider({ posture: "folded", viewport });
  const folyx = createFolyx({ provider: mock });
  const get = vi.spyOn(folyx, "getSnapshot");
  const subscribe = vi.spyOn(folyx, "subscribe");
  const setupStates: string[] = [];
  const Component = defineComponent({
    setup() {
      const state = useFolyx({ folyx });
      setupStates.push(state.posture.value);
      return () => h("p", `${state.posture.value}:${state.snapshot.value.availability.posture}`);
    },
  });
  const html = await renderToString(createSSRApp(Component));

  expect(html).toContain("unknown:unavailable");
  expect(get).not.toHaveBeenCalled();
  expect(subscribe).not.toHaveBeenCalled();

  mock.set({ posture: "continuous" });
  const container = host();
  container.innerHTML = html;
  const error = vi.spyOn(console, "error");
  const warn = vi.spyOn(console, "warn");
  const app = createSSRApp(Component);
  app.mount(container);
  await nextTick();

  expect(setupStates).toEqual(["unknown", "unknown"]);
  expect(container.textContent).toBe("continuous:available");
  expect(error).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();

  app.unmount();
});

test("shared ownership: unmounting one component leaves siblings and caller subscriptions active", async () => {
  const mock = createMockProvider({ posture: "folded", viewport });
  const folyx = createFolyx({ provider: mock });
  const outside = vi.fn();
  const stopOutside = folyx.subscribe(outside);
  const showFirst = ref(true);
  const Child = defineComponent({
    setup() {
      const { posture } = useFolyx({ folyx });
      return () => h("span", posture.value);
    },
  });
  const Parent = defineComponent({
    setup() {
      return () =>
        h("main", [
          showFirst.value ? h(Child, { key: "first" }) : null,
          h(Child, { key: "second" }),
        ]);
    },
  });
  const container = host();
  const app = createApp(Parent);
  app.mount(container);
  await nextTick();

  expect(container.querySelectorAll("span")).toHaveLength(2);

  showFirst.value = false;
  await nextTick();
  mock.set({ posture: "continuous" });
  await nextTick();

  expect(container.textContent).toBe("continuous");
  expect(outside).toHaveBeenCalledTimes(2);

  app.unmount();
  mock.set({ posture: "folded" });

  expect(outside).toHaveBeenCalledTimes(3);

  stopOutside();
});

test("provider lifecycle starts on mount, sees changes before mount, and returns readonly refs", async () => {
  const mock = createMockProvider({ posture: "folded", viewport });
  const subscribe = vi.spyOn(mock, "subscribe");
  let bindings: ReturnType<typeof useFolyx> | undefined;
  const Component = defineComponent({
    setup() {
      bindings = useFolyx({ provider: mock });

      expect(subscribe).not.toHaveBeenCalled();

      onBeforeMount(() => mock.set({ posture: "continuous" }));
      return () => h("p", bindings!.posture.value);
    },
  });
  const app = createApp(Component);
  const container = host();
  app.mount(container);
  await nextTick();

  expect(container.textContent).toBe("continuous");
  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(isReadonly(bindings!.posture)).toBe(true);

  app.unmount();
  mock.set({ posture: "folded" });

  expect(bindings!.posture.value).toBe("continuous");
});

test("setup calls abandoned by SSR never acquire a subscription", async () => {
  const mock = createMockProvider();
  const subscribe = vi.spyOn(mock, "subscribe");
  await renderToString(
    createSSRApp(
      defineComponent({
        setup() {
          useFolyx({ provider: mock });
          return () => h("p", "SSR");
        },
      }),
    ),
  );

  expect(subscribe).not.toHaveBeenCalled();
});

test("requires component setup", () => {
  expect(() => useFolyx()).toThrow("setup");
});
