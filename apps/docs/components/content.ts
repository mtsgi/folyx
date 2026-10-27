/** Text shared by the rendered diagrams and their Markdown descriptions. */
export type DocsLocale = "en" | "ja";
export type DiagramKind =
  | "overview"
  | "layout"
  | "providers"
  | "coordinates"
  | "ssr"
  | "philosophy";

export const docsLocale = (locale: unknown): DocsLocale => (locale === "ja" ? "ja" : "en");

export const packageManagers = ["npm", "pnpm", "Yarn", "Bun"] as const;
export type PackageManager = (typeof packageManagers)[number];

export const installCommand = (manager: PackageManager, packages: readonly string[]): string =>
  `${manager.toLowerCase()} ${manager === "npm" ? "install" : "add"} ${packages.join(" ")}`;

export const heroContent = {
  en: {
    headline: "Make room for every screen shape.",
    body: "Read the available regions, follow changes, and choose a layout that fits your app. Start with TypeScript or connect Folyx to Vue.",
    start: "Get started",
    experiment: "Try FoldLab",
  },
  ja: {
    headline: "画面の形に合わせて、UIをつくる。",
    body: "使える表示領域を読み取り、変化に合わせてレイアウトを選べます。TypeScriptでそのまま使うことも、Vueと組み合わせることもできます。",
    start: "使い始める",
    experiment: "FoldLabで試す",
  },
} satisfies Record<
  DocsLocale,
  { headline: string; body: string; start: string; experiment: string }
>;

interface DiagramCard {
  sketch: string;
  title: string;
  detail: string;
}

interface DiagramContent {
  title: string;
  description: string;
  cards: DiagramCard[];
}

export const diagramContent = {
  en: {
    overview: {
      title: "One API, different region arrangements",
      description:
        "A single region, side-by-side regions, or stacked regions. These are layouts, not device postures or physical screen counts.",
      cards: [],
    },
    layout: {
      title: "Read the arrangement, then choose your interface",
      description:
        "Layout describes region geometry. horizontal and vertical describe the arrangement of regions, not the hinge direction.",
      cards: [
        { sketch: "single", title: "single", detail: "One region in the viewport." },
        {
          sketch: "horizontal",
          title: "horizontal",
          detail: "Side by side, with matching top edges and heights.",
        },
        {
          sketch: "vertical",
          title: "vertical",
          detail: "Top to bottom, with matching left edges and widths.",
        },
        {
          sketch: "complex",
          title: "complex",
          detail: "Other geometry, such as these overlapping regions.",
        },
        {
          sketch: "unknown",
          title: "unknown",
          detail: "No regions are available to describe a layout.",
        },
      ],
    },
    providers: {
      title: "Different sources, the same application code",
      description:
        "Choose a Provider. Core turns its readings into a public snapshot, which your application can read directly or through the Vue adapter.",
      cards: [
        {
          sketch: "sources",
          title: "1. Provider",
          detail: "Browser, Mock, or a custom source supplies readings.",
        },
        {
          sketch: "snapshot",
          title: "2. Core",
          detail: "Builds a snapshot with values, layout, sources, and availability.",
        },
        {
          sketch: "application",
          title: "3. Your app",
          detail: "Uses TypeScript or Vue to decide what to render.",
        },
      ],
    },
    coordinates: {
      title: "The same unit can have a different origin",
      description:
        "Public rectangles use CSS px from the layout viewport’s upper-left corner. The dashed visual viewport illustrates a shifted visible area; version 0.1 does not map that shifted frame into public segments.",
      cards: [
        {
          sketch: "layout-frame",
          title: "Layout viewport",
          detail:
            "The fixed reference frame for viewport, segments, and gaps. Its origin is (0, 0).",
        },
        {
          sketch: "visual-frame",
          title: "Visual viewport",
          detail: "The visible area can change size or move during zoom, pan, or keyboard display.",
        },
      ],
    },
    ssr: {
      title: "Start together, then follow the browser",
      description:
        "SSR and the first client render share the same initial state. Subscriptions begin on mount and end when the component’s scope is disposed.",
      cards: [
        {
          sketch: "initial",
          title: "1. SSR",
          detail: "Unknown posture and layout, unavailable APIs, null viewport, and no regions.",
        },
        {
          sketch: "initial",
          title: "2. First client render",
          detail: "The same initial state keeps hydration consistent. No subscription yet.",
        },
        {
          sketch: "live",
          title: "3. Mount",
          detail: "Subscribe and immediately receive the latest snapshot, then follow changes.",
        },
        {
          sketch: "cleanup",
          title: "4. Scope disposal",
          detail: "Release this component’s subscription. Other consumers keep theirs.",
        },
      ],
    },
    philosophy: {
      title: "Know what each value represents",
      description:
        "Observed values, derived geometry, and fallback regions serve different purposes. availability says whether the API supplied a reading; source says where a public value came from.",
      cards: [
        {
          sketch: "observed",
          title: "Observed",
          detail: "For example, posture reported by the selected Provider.",
        },
        {
          sketch: "derived",
          title: "Derived",
          detail: "layout and gaps are calculated from the region geometry.",
        },
        {
          sketch: "fallback",
          title: "Fallback",
          detail:
            "A known viewport can supply one replacement region when segments cannot be used.",
        },
      ],
    },
  },
  ja: {
    overview: {
      title: "画面領域の並びが変わっても、同じAPIで",
      description:
        "1つの領域、左右に並ぶ領域、上下に並ぶ領域。図が表すのは配置であり、端末の姿勢や物理的な画面の数ではありません。",
      cards: [],
    },
    layout: {
      title: "領域の並びを読み取り、UIの配置を決める",
      description:
        "layoutは領域の配置を表します。horizontalとverticalは領域の並ぶ方向で、ヒンジの向きではありません。",
      cards: [
        { sketch: "single", title: "single", detail: "表示領域が1つある状態です。" },
        {
          sketch: "horizontal",
          title: "horizontal",
          detail: "上端と高さが揃った領域が、左右に並びます。",
        },
        {
          sketch: "vertical",
          title: "vertical",
          detail: "左端と幅が揃った領域が、上下に並びます。",
        },
        {
          sketch: "complex",
          title: "complex",
          detail: "図のように領域が重なるなど、ほかの分類に当てはまらない配置です。",
        },
        { sketch: "unknown", title: "unknown", detail: "配置を判断するための領域がありません。" },
      ],
    },
    providers: {
      title: "情報源が変わっても、アプリでの使い方は同じ",
      description:
        "Providerを選ぶと、Coreが取得した情報を公開用のsnapshotにまとめます。アプリでは、その状態を直接読み取ることも、Vueを通して受け取ることもできます。",
      cards: [
        {
          sketch: "sources",
          title: "1. Provider",
          detail: "Browser・Mock・独自の情報源から、計測値を渡します。",
        },
        {
          sketch: "snapshot",
          title: "2. Core",
          detail: "値・配置・値の取得元・APIの取得状況をsnapshotにまとめます。",
        },
        {
          sketch: "application",
          title: "3. アプリ",
          detail: "TypeScriptやVueで状態を読み取り、何を表示するか決めます。",
        },
      ],
    },
    coordinates: {
      title: "単位が同じでも、座標の基準が違うことがある",
      description:
        "公開する矩形の座標は、レイアウトビューポートの左上を原点とするCSS pxです。破線は表示範囲がずれた例です。バージョン0.1では、このようにずれた座標系を公開領域へ変換しません。",
      cards: [
        {
          sketch: "layout-frame",
          title: "レイアウトビューポート",
          detail: "viewport・segments・gapsの基準です。左上を原点(0, 0)として扱います。",
        },
        {
          sketch: "visual-frame",
          title: "Visual Viewport",
          detail:
            "現在見えている範囲です。ズーム・パン・キーボード表示で位置や大きさが変わります。",
        },
      ],
    },
    ssr: {
      title: "同じ状態で描画を始め、mount後に更新する",
      description:
        "SSRとクライアントの初回描画では、同じ初期値を使います。mount後に購読を始め、コンポーネントのscopeが終了したら解除します。",
      cards: [
        {
          sketch: "initial",
          title: "1. SSR",
          detail: "姿勢とlayoutはunknown、APIはunavailable、viewportはnull、領域は空配列です。",
        },
        {
          sketch: "initial",
          title: "2. クライアント初回描画",
          detail:
            "SSRと同じ初期値で描画し、ハイドレーション時の不一致を防ぎます。まだ購読しません。",
        },
        {
          sketch: "live",
          title: "3. mount",
          detail: "購読を始め、最新のsnapshotをすぐに受け取ります。その後も変化を追います。",
        },
        {
          sketch: "cleanup",
          title: "4. scope終了",
          detail: "このコンポーネントの購読を解除します。ほかの利用者の購読は続きます。",
        },
      ],
    },
    philosophy: {
      title: "観測値・計算値・フォールバックを区別する",
      description:
        "値の種類によって役割が異なります。availabilityはAPIから情報を取得できたかを、sourceは公開する値の取得元を表します。",
      cards: [
        {
          sketch: "observed",
          title: "観測値",
          detail: "選んだProviderが報告する姿勢など、取得した情報です。",
        },
        { sketch: "derived", title: "計算値", detail: "layoutやgapsは、領域の座標から求めます。" },
        {
          sketch: "fallback",
          title: "フォールバック",
          detail: "領域を使えない場合、寸法が既知ならviewport全体を代わりの領域にします。",
        },
      ],
    },
  },
} satisfies Record<DocsLocale, Record<DiagramKind, DiagramContent>>;
