# In-app support chat (contract)

Owner decisions (Ravi, 2026-11-28): in-app only (no WhatsApp); first replies are fixed rules + quick-reply buttons; the owner (only him, not washers) takes over from the ops page; no push notifications (customer sees replies when the chat is open; owner sees new chats when he opens the Support tab). Look: copy the flow of the Zepto help reference, not its brand. Violet app style.

## Flow (customer app)
Profile > Help & Support (existing Help page gets a "Chat with us" row that opens the in-app chat) ; My bookings > a booking > "Need help with this booking?" card > Issue list > Chat.
Issue list = state.ts `SUPPORT_TOPICS` (id,label,reply). Opening a chat = `act.supportOpen(topicId, booking?)` which returns the chat id; then `openPage({ k: 'supportChat', id })`.
Chat page: header (name "Washing Daddy Support", online dot, ticket number `chat.ticket` tappable to copy, "End chat" button), message bubbles (customer right, bot/agent left, time), quick-reply buttons from `msg.buttons` on the LAST bot message only while chat is not closed, text input + send (act.supportSend). When `chat.status==='closed'`: grey line "This conversation is marked as Closed", then "How was your conversation?" Good / Bad (act.supportRate; show chosen state), and "Still have an issue? Chat with us" that opens a new chat. Agent bubbles show the agent name (`chat.agent` or "Washing Daddy"). Subscribe with `useEffect(() => act.supportWatch(id), [id])`.

## State API (customer app, src/state.ts, already written, do not edit state.ts)
types SupMsg, SupChat, SupButton; `supportChats()`, `supportChat(id)`, `supportMsgs(id)`, `SUPPORT_TOPICS`; act.supportOpen / supportSend / supportPick(id, buttonId) / supportEnd / supportRate / supportWatch. Pages: `{ k: 'supportIssues'; bookingId?: string; title?: string }` and `{ k: 'supportChat'; id: string }` already in the Page type; register them in src/screens/Main.tsx.

## Firestore (admin side)
supportchats/{id}: phone, name, ticket, topic, topic_label, booking_id, booking_title, status ('open'|'human'|'closed'), agent, rating ('good'|'bad'|''), last_text, last_from, updated_at, created_at, unread_admin (bool), closed_at.
supportchats/{id}/messages/{mid}: from ('customer'|'bot'|'agent'), text (<=1000), at (IST ISO string like 2026-11-28T12:45:00+05:30), buttons?, pick?.
Admin (owner) reply: write a message {from:'agent', text, at} and update the chat {status:'human', agent:'Ravi', last_text, last_from:'agent', updated_at, unread_admin:false}. Admin "End chat": update {status:'closed', closed_at, updated_at}. Opening a chat in the inbox sets unread_admin:false.
