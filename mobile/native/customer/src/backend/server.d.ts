// Types for the platform files: server.native.ts on phones (n8n money webhooks with a Firebase ID token),
// server.web.ts in the preview (null: the app runs the demo money logic locally).
export type ServerError = Error & { notReady?: boolean; status?: number };
export type Server = {
  /** POST https://n8n.washingdaddy.com/webhook/<path> with Authorization: Bearer <Firebase ID token>. Rejects with a
   *  message ready for a toast; notReady=true when the webhook does not exist yet (404), so the caller can fall back. */
  call<T = any>(path: string, body: object): Promise<T>;
};
export declare const server: Server | null;
