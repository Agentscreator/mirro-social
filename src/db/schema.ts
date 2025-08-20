import { pgTable, pgEnum, varchar, integer, uuid, date, text, timestamp, real } from "drizzle-orm/pg-core"

/* ENUMS */
export const tagCategoryEnum = pgEnum("tag_category", ["interest", "context", "intention"])
export const storyTypeEnum = pgEnum("story_type", ["personal", "community"])

/* TABLES */

// Users (updated with new fields)
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  dob: date("dob").notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  metro_area: varchar("metro_area", { length: 100 }).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  profileImage: varchar("profile_image", { length: 500 }),
  about: text("about"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  image: varchar("image", { length: 500 }),
})

// Communities
export const communitiesTable = pgTable("communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Community Members
export const communityMembersTable = pgTable("community_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  communityId: uuid("community_id")
    .notNull()
    .references(() => communitiesTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})

// Stories (UPDATED TABLE)
export const storiesTable = pgTable("stories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  type: storyTypeEnum("type").notNull().default("personal"),
  communityId: uuid("community_id").references(() => communitiesTable.id), // Only for community stories
  content: text("content"), // Optional text content
  image: varchar("image", { length: 500 }), // Optional image URL
  video: varchar("video", { length: 500 }), // Optional video URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Stories expire after 24 hours
})

// Story Views (NEW TABLE)
export const storyViewsTable = pgTable("story_views", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  storyId: integer("story_id")
    .notNull()
    .references(() => storiesTable.id),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
})

// Tags
export const tagsTable = pgTable("tags", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull().unique(),
  category: tagCategoryEnum("tag_category").notNull(),
})

// User–Tag Mapping
export const userTagsTable = pgTable("user_tags", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tagsTable.id),
})

// Thoughts (with added title field)
export const thoughtsTable = pgTable("thoughts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  title: varchar("title", { length: 200 }), // Added from original - nullable
  content: text().notNull(),
  embedding: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
})

// Post Status Enum
export const postStatusEnum = pgEnum("post_status", ["draft", "scheduled", "live", "expired"])

// Posts (transitioning to video-only short form content)
export const postsTable = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  content: text().notNull(),
  image: varchar("image", { length: 500 }), // Legacy support during transition
  video: varchar("video", { length: 500 }), // Preferred for new posts
  duration: integer("duration"), // Video duration in seconds (optional)
  editedVideoData: text("edited_video_data"), // JSON data for video editor projects
  hasPrivateLocation: integer("has_private_location").notNull().default(0), // 0 = no, 1 = yes
  communityName: varchar("community_name", { length: 100 }), // Name for auto-created community
  status: postStatusEnum("status").notNull().default("live"), // Post status for scheduling
  publishTime: timestamp("publish_time"), // When to publish (null = immediate)
  expiryTime: timestamp("expiry_time"), // When to expire/remove from feed (null = never)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Post Likes
export const postLikesTable = pgTable("post_likes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Post Comments (with nested comment support) - Fixed self-reference
export const postCommentsTable = pgTable("post_comments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  parentCommentId: integer("parent_comment_id"), // Remove self-reference for now
  content: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Followers/Following
export const followersTable = pgTable("followers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  followerId: uuid("follower_id")
    .notNull()
    .references(() => usersTable.id),
  followingId: uuid("following_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Profile Visitors
export const profileVisitorsTable = pgTable("profile_visitors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => usersTable.id),
  visitorId: uuid("visitor_id")
    .notNull()
    .references(() => usersTable.id),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
})

// User Settings (NEW TABLE)
export const userSettingsTable = pgTable("user_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id)
    .unique(),
  inviteMode: varchar("invite_mode", { length: 20 }).notNull().default("manual"), // "manual" or "auto"
  autoAcceptLimit: integer("auto_accept_limit").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Post Invites (NEW TABLE)
export const postInvitesTable = pgTable("post_invites", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  inviteDescription: text("invite_description"), // What the user is inviting people to do
  participantLimit: integer("participant_limit").notNull().default(10),
  currentParticipants: integer("current_participants").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Invite Requests (NEW TABLE)
export const inviteRequestsTable = pgTable("invite_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  inviteId: integer("invite_id")
    .notNull()
    .references(() => postInvitesTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "accepted", "denied"
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
})

// Post Invite Participants (NEW TABLE) - tracks who has accepted invites
export const postInviteParticipantsTable = pgTable("post_invite_participants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  inviteId: integer("invite_id")
    .notNull()
    .references(() => postInvitesTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})

// Post Shares (NEW TABLE)
export const postSharesTable = pgTable("post_shares", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  userId: uuid("user_id")
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Messages (ENHANCED TABLE)
export const messagesTable = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => usersTable.id),
  content: text(), // Made nullable for attachment-only messages
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"), // text, image, audio, file
  attachmentUrl: text("attachment_url"),
  attachmentType: varchar("attachment_type", { length: 50 }), // image/jpeg, audio/mp3, etc.
  attachmentName: varchar("attachment_name", { length: 255 }),
  attachmentSize: integer("attachment_size"), // in bytes
  duration: integer(), // for audio messages in seconds
  isRead: integer("is_read").notNull().default(0), // 0 = unread, 1 = read
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Albums (FIXED TABLE)
export const albumsTable = pgTable("albums", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => usersTable.id),
  isPublic: integer("is_public").notNull().default(1), // 0 = private, 1 = public
  allowContributions: integer("allow_contributions").notNull().default(1), // 0 = no, 1 = yes
  shareToken: varchar("share_token", { length: 64 }).unique(), // For sharing albums via link
  maxContributors: integer("max_contributors"), // null = unlimited (nullable by default)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Album Contributors (NEW TABLE)
export const albumContributorsTable = pgTable("album_contributors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albumsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  canEdit: integer("can_edit").notNull().default(0), // 0 = view only, 1 = can edit
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})

// Album Images (NEW TABLE)
export const albumImagesTable = pgTable("album_images", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albumsTable.id),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => usersTable.id),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  caption: text(),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Album Image Likes (NEW TABLE)
export const albumImageLikesTable = pgTable("album_image_likes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  imageId: integer("image_id")
    .notNull()
    .references(() => albumImagesTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Album Shares (NEW TABLE)
export const albumSharesTable = pgTable("album_shares", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albumsTable.id),
  sharedBy: uuid("shared_by")
    .notNull()
    .references(() => usersTable.id),
  sharedWith: uuid("shared_with")
    .references(() => usersTable.id), // null if shared publicly
  shareToken: varchar("share_token", { length: 64 }).notNull(),
  accessLevel: varchar("access_level", { length: 20 }).notNull().default("view"), // "view", "contribute"
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Album Join Requests (NEW TABLE)
export const albumJoinRequestsTable = pgTable("album_join_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albumsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "approved", "denied"
  requestMessage: text(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  respondedBy: uuid("responded_by")
    .references(() => usersTable.id),
})

// Album Image Comments (NEW TABLE)
export const albumImageCommentsTable = pgTable("album_image_comments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  imageId: integer("image_id")
    .notNull()
    .references(() => albumImagesTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  content: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Location Requests (NEW TABLE)
export const locationRequestsTable = pgTable("location_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => usersTable.id),
  postOwnerId: uuid("post_owner_id")
    .notNull()
    .references(() => usersTable.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "accepted", "denied"
  locationName: varchar("location_name", { length: 200 }),
  locationAddress: text("location_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
})

// Post Locations (NEW TABLE) - stores private location data for posts
export const postLocationsTable = pgTable("post_locations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  locationName: varchar("location_name", { length: 200 }).notNull(),
  locationAddress: text("location_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isPrivate: integer("is_private").notNull().default(1), // 0 = public, 1 = private
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Groups (NEW TABLE)
export const groupsTable = pgTable("groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  postId: integer("post_id")
    .references(() => postsTable.id), // Reference to the post that created this group
  isActive: integer("is_active").notNull().default(1), // 0 = inactive, 1 = active
  maxMembers: integer("max_members").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Group Members (NEW TABLE)
export const groupMembersTable = pgTable("group_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groupsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  role: varchar("role", { length: 20 }).notNull().default("member"), // "admin", "member"
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})

// Group Messages (NEW TABLE)
export const groupMessagesTable = pgTable("group_messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groupsTable.id),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id),
  content: text(),
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"),
  attachmentUrl: text("attachment_url"),
  attachmentType: varchar("attachment_type", { length: 50 }),
  attachmentName: varchar("attachment_name", { length: 255 }),
  attachmentSize: integer("attachment_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Group Stories (NEW TABLE)
export const groupStoriesTable = pgTable("group_stories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groupsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  content: text(),
  image: varchar("image", { length: 500 }),
  video: varchar("video", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
})

// Group Story Views (NEW TABLE)
export const groupStoryViewsTable = pgTable("group_story_views", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  storyId: integer("story_id")
    .notNull()
    .references(() => groupStoriesTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
})

// Notifications (ENHANCED TABLE)
export const notificationsTable = pgTable("notifications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id), // The user who receives the notification
  fromUserId: uuid("from_user_id")
    .references(() => usersTable.id), // The user who triggered the notification (optional)
  type: varchar("type", { length: 50 }).notNull(), // "invite_accepted", "invite_request", "group_invite", etc.
  title: varchar("title", { length: 200 }).notNull(),
  message: text().notNull(),
  data: text("data"), // JSON data for additional notification context
  isRead: integer("is_read").notNull().default(0), // 0 = unread, 1 = read
  actionUrl: varchar("action_url", { length: 500 }), // URL to navigate to when notification is clicked
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Password Reset Tokens
export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: integer("used").notNull().default(0), // 0 = unused, 1 = used
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Live Events (NEW TABLE) - Scheduled events that become active at specific times
export const liveEventsTable = pgTable("live_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  isActive: integer("is_active").notNull().default(0), // 0 = inactive, 1 = active
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // "scheduled", "live", "ended", "cancelled"
  maxParticipants: integer("max_participants").default(50),
  currentParticipants: integer("current_participants").notNull().default(0),
  location: varchar("location", { length: 500 }),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Live Event Participants (NEW TABLE)
export const liveEventParticipantsTable = pgTable("live_event_participants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id")
    .notNull()
    .references(() => liveEventsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  isHost: integer("is_host").notNull().default(0), // 0 = participant, 1 = host
})

// Live Streams (NEW TABLE) - Real-time streaming sessions
export const liveStreamsTable = pgTable("live_streams", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  streamKey: varchar("stream_key", { length: 255 }).notNull().unique(),
  streamUrl: varchar("stream_url", { length: 500 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  isLive: integer("is_live").notNull().default(0), // 0 = offline, 1 = live
  viewerCount: integer("viewer_count").notNull().default(0),
  maxViewers: integer("max_viewers").notNull().default(0),
  category: varchar("category", { length: 100 }),
  tags: text("tags"), // JSON array of tags
  isPrivate: integer("is_private").notNull().default(0), // 0 = public, 1 = private
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Live Stream Viewers (NEW TABLE)
export const liveStreamViewersTable = pgTable("live_stream_viewers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  streamId: integer("stream_id")
    .notNull()
    .references(() => liveStreamsTable.id),
  userId: uuid("user_id")
    .references(() => usersTable.id), // nullable for anonymous viewers
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  totalWatchTime: integer("total_watch_time").notNull().default(0), // in seconds
})

// Live Stream Chat (NEW TABLE)
export const liveStreamChatTable = pgTable("live_stream_chat", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  streamId: integer("stream_id")
    .notNull()
    .references(() => liveStreamsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"), // "text", "emoji", "system"
  isModerated: integer("is_moderated").notNull().default(0), // 0 = not moderated, 1 = moderated
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Saved Profiles (NEW TABLE) - Users can save profiles they're interested in
export const savedProfilesTable = pgTable("saved_profiles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id), // The user who saves the profile
  savedUserId: uuid("saved_user_id")
    .notNull()
    .references(() => usersTable.id), // The user whose profile is saved
  createdAt: timestamp("created_at").defaultNow().notNull(),
})