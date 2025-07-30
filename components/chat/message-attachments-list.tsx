import { MessageAttachment } from "./message-attachment"
import type { StreamAttachment } from '@/types/stream-chat'

interface MessageAttachmentsListProps {
  attachments: StreamAttachment[]
}

export function MessageAttachmentsList({ attachments }: MessageAttachmentsListProps) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="space-y-2 mt-1">
      {attachments.map((attachment, index) => (
        <MessageAttachment key={index} attachment={attachment} />
      ))}
    </div>
  )
}
