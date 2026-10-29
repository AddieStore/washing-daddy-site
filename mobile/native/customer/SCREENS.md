# Screen assignments (for the workers)

App folder: `/home/claude/washing-daddy-site/mobile/native/customer` (moved from apps/customer). Read `PORTING.md`
first, then `src/state.ts` (the contract: header comment, view helpers, `act.*`), `src/ui/kit.tsx`, `src/ui/hosts.tsx`,
`src/ui/icons.tsx`, `src/ui/art.tsx`, `src/theme.ts`, `src/img.ts`, `src/data/*`.

Never import Firebase, Cashfree, AsyncStorage or fetch from screens or sheets: everything goes through `src/state.ts`.
If state is missing something you need, do not edit state.ts: write the smallest local helper in your own file and list it
in your final report so the lead can move it.

Shared names (so files written in parallel fit together):

- `src/screens/Main.tsx` (default export): the signed-in shell. Renders the current tab's screen from `useApp().tab`
  inside the screen's own `Page`, and the `TabBar`. Screens are default exports of `src/screens/Home.tsx`, `Live.tsx`,
  `Plan.tsx`, `Store.tsx`, `Profile.tsx`, each taking no props. `useApp().tabNonce` changes when the current tab is tapped
  again: scroll to top.
- `src/screens/Auth.tsx` (default export): sign-in and sign-up.
- `src/sheets/index.tsx` exports `sheets`, an object of functions that open bottom sheets with `openSheet(<X/>)`:
  `payPlan() switchPlan(id) pause() note() tip() book() track(docId) bookings() issue() requests() orders() cart()
  product(id) addCar() editDetail(k: 'parking'|'window'|'keys') editName() notifs() help() logout() deleteAccount()
  day(date) proof() seePlans()`. On import it also sets `sheetHooks.payPlan = sheets.payPlan` etc. for the four hooks in
  state.ts. Screens call `sheets.x()`.
- Images: `src(...)` from `src/img.ts`; for a car use `src(carImg(c))`.
