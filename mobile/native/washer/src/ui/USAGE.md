# UI kit v22 (reference look). Import everything from `../ui`.

Rules: canvas `c.canvas` (#F6F6F7), text `c.fg` (#141414), the one grey `c.grey` (#7A7A80), hairline `c.line` (#EDEDF0). Violet (`c.primary`) only on primary buttons, active states, key numbers. No violet heroes on tab screens.
Screen skeleton: `<ScreenTitle/>`, then `<SectionLabel/>` + `<Group>` pairs; leave ~100px bottom padding for the floating tab bar (or add `<StickyBar/>` on action screens).

- `Group {children, style}`: one white card (r16, hairline). Children are separated by hairline dividers. Put `Row`s (or any node) inside.
- `Row {icon?: IconName|node, label, sub?, value?, right?, chevron?, onPress?, destructive?}`: 56px, 22px line icon, 15/500 label, grey value, chevron when `onPress`. Legacy aliases `title`/`subtitle`/`divider` still accepted. (Old kit `Row` was replaced by this.)
- `SectionLabel {children}`: 13/500 grey label above a Group.
- `ScreenTitle {title, subtitle?, right?}`: 28/700 plain title incl. safe-area top padding. `right` = `<HeaderIconButton icon="plus" label="Nayi gaadi add karo" onPress={openAddCar} badge?/>`.
- `HeaderIconButton {icon, label, onPress, badge?}`: 40px round header button.
- `FloatingTabBar {tabs:[{key,label,icon,badge?}], active, onSelect}`: used by `(tabs)/_layout.tsx`; Add-car now lives in headers, not in the bar.
- `StickyBar {summary?, summaryLabel?, label, onPress, disabled?, loading?, variant?, inline?}`: white bar, hairline top, 52px brand Button; absolute at bottom unless `inline`.
- `SheetHeader {title, action?, onAction?, actionIcon?}`: 20/700 left title + small outlined action (use inside `Sheet`/`sheet.open`).
- `Chip {children, tone?, icon?}`: tones `violet|green|grey|red|dark|amber|blue`, 12/600, tinted.
- `Receipt {title?, children, footer?}` + `ReceiptRow {label, value, strike?, hint?, onHint?, total?, tone?:'ok'}`: bill summary; `hint` = dotted underline label; `total` = bold row with hairline above.
- Theme additions: `c.canvas`, `c.grey`, `c.navOn`, `c.navOnInk`, `c.navShadow`; `c.ink` is now #141414 (light) / #F4F4F5 (dark); `bg` is #F6F6F7.
