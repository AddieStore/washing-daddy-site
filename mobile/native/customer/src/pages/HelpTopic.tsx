// One help topic: FAQ accordions. OWNER: HELP worker (pronto-video-2026-11-15/CONTRACT.md). Stub from CORE: replace the body, keep the default export and props.
import React from 'react';
import Stub from './Stub';
import type { HelpTopic } from '../data/help';
type HelpTopicId = HelpTopic['id'];

export default function HelpTopic({ id }: { id: HelpTopicId }) {
  return <Stub title="Help" />;
}
