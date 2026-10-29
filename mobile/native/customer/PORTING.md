# Native customer app: porting guide

This folder is the Washing Daddy customer app rebuilt as a native Expo React Native app (Expo SDK 58, RN 0.88,
React 19.3, TypeScript strict). It replaces the website wrapper (`/customer/index.html` packaged in a WebView).
Package id stays `com.washingdaddy.customer`.

**Source of truth for behaviour, wording and look:** `/home/claude/washing-daddy-site/customer/index.html`
(770 KB because of inline images; the code without images is in
`/tmp/claude-0/-home-claude-washing-daddy-site/6efac730-6d03-5e3c-9080-1ec095ab8a65/scratchpad/cust-small.html`:
HTML screens at lines 839-1078, JS at 1079-2306, CSS at 40-838; the "Day" look is the `.wd-day` block from line ~596).
Screenshots of the current app: `.../scratchpad/shots/*.png` (home, home2, live, live2, plan, plan2, store, store2,
profile, profile2, auth). Port copy text word for word. Keep the Day look (violet poster, cream cards with a 3px ink
border and a hard 6px violet-ink offset shadow, gold accents, Anton headings in uppercase, Poppins body).

## Layout

```
App.tsx                 fonts, providers, boot, auth vs tabs           (core)
src/theme.ts            colours (C), fonts (F), Day/Night themes, Ink contexts   (done)
src/img.ts              IMG map of bundled photos, src(), RATIO         (done)
src/data/dates.ts       TODAY (IST), iso, parse, addDays, fmt, inr, ampm, hm, nowIST, wait   (done)
src/data/reference.ts   PLANS, AREAS, PRODUCTS, CATS, SERVICES, SLIDES, SUPPORT_PHONE      (done)
src/data/model.ts       types (Car, Account, WashDoc...), schedule, pause rules, wash docs (done)
src/backend/*           Firebase (native) / none (web), Cashfree        (core, lead only)
src/state.ts            app state + actions                              (core, lead only)
src/ui/kit.tsx          design kit                                       (worker)
src/ui/icons.tsx        SVG icons                                        (worker)
src/ui/art.tsx          product art SVGs                                 (worker)
src/ui/hosts.tsx        Toast, Sheet, Confetti hosts                     (worker)
src/screens/*.tsx       Auth, Home, Live, Plan, Store, Profile, TabBar   (workers)
src/sheets/*.tsx        bottom-sheet contents                            (workers)
tools/preview.mjs       web export -> one self-contained HTML           (worker)
```

Only `src/state.ts` and `src/backend/*` talk to Firebase, payments or storage. Screens and sheets never import
`@react-native-firebase/*`, `react-native-cashfree-pg-sdk` or AsyncStorage.

## Rules for UI code

- Use `react-native-svg` for icons and art (it works on web too). No other new dependencies without asking.
- Text: always use `Txt` from the kit (it picks the Poppins file per weight and the colour from `InkContext`).
  Android ignores `fontWeight` with custom fonts, so weights map to font families (`F.b600` etc.).
- Colours come from `useTheme()` / `useInk()` (see `src/theme.ts`). A cream card provides `T.card` ink to its
  children; a violet block provides `T.block`; the page is `T.page`.
- Hard shadows: RN has no solid offset shadow, so `Hard` (kit) draws a copy of the shape behind, offset.
  In the Night theme `T.shadow` is null and no hard shadow is drawn.
- Animations: RN `Animated` with `useNativeDriver: true` where possible. Respect reduced motion
  (`AccessibilityInfo.isReduceMotionEnabled`).
- Must run on Android, iOS and web (react-native-web) — the web build is the Claude preview.
- Typecheck: `npx tsc --noEmit` from `mobile/native/customer`.

## State API (src/state.ts) — what screens use

See the file's header comment; it is the contract. In short: `useApp()` re-renders on any change; read `S`, `A()`,
`car()`, `doc(c)`; call actions (`act.*`); UI hosts `toast()`, `openSheet()`, `closeSheet()`, `confetti()`, `haptic()`;
navigation `go(tab)`.
