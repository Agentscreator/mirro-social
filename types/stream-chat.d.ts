// Extend Stream Chat types to support custom events and proper typing
import type { DefaultGenerics, Event, UserResponse, ChannelMemberResponse, MessageResponse } from "stream-chat"

// Custom attachment interface for better type safety
export interface StreamAttachment {
  type?: string
  title?: string
  asset_url?: string
  image_url?: string
  thumb_url?: string
  mime_type?: string
  file_size?: number | undefined
  duration?: number
}

// Typed channel member interface
export interface TypedChannelMember extends ChannelMemberResponse {
  user?: UserResponse
}

// Custom message data type for calls
export interface CustomMessageData {
  is_call?: boolean
  call_type?: string
  target_user?: string
  call_id?: string
  status?: 'ringing' | 'connected' | 'ended'
  caller_id?: string
  participant_id?: string
}

// Extended message interface that handles both local and server messages
export interface TypedMessage {
  id?: string
  text?: string
  html?: string
  type?: string
  status?: string
  user?: UserResponse
  attachments?: StreamAttachment[]
  custom?: CustomMessageData
  created_at?: string | Date
  updated_at?: string | Date
  deleted_at?: string | Date
  latest_reactions?: any[]
  own_reactions?: any[]
  reaction_counts?: Record<string, number>
  reply_count?: number
  cid?: string
  [key: string]: any
}

// Extend the EventTypes to include our custom event types
declare module "stream-chat" {
  interface EventTypes {
    custom: "custom"
    call_initiated: "call.initiated"
    call_accepted: "call.accepted"
    call_rejected: "call.rejected"
    call_ended: "call.ended"
    'custom.call_status': string
  }

  // Extend the Event interface to include our custom event properties
  interface Event<StreamChatGenerics extends DefaultGenerics = DefaultGenerics> {
    call_initiated?: boolean
    call_type?: "audio" | "video"
    target_user?: string
    call_id?: string
  }

  // Extend the ChannelData interface to include our custom properties
  interface ChannelData {
    archived?: boolean
    pinned?: boolean
    pinned_at?: string
    pinned_by?: string
    name?: string
    image?: string
    [key: string]: any
  }

  // Extend MessageData interface
  interface MessageData {
    custom?: CustomMessageData
  }

  // Extend DefaultGenerics for better typing
  interface DefaultGenerics {
    attachmentType: StreamAttachment
    memberType: TypedChannelMember
    messageType: TypedMessage
  }
}

// Export custom event types for use in components
export interface CustomCallEvent extends Event {
  type: "custom"
  call_initiated?: boolean
  call_type?: "audio" | "video"
  target_user?: string
  user?: {
    id: string
    name?: string
    image?: string
  }
}
