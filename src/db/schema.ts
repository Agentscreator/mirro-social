import { pgTable, pgEnum, varchar, integer, uuid, date, text, timestamp, real } from "drizzle-orm/pg-core"

/* ENUMS */
export const tagCategoryEnum = pgEnum("tag_category", ["interest", "context", "intention"])
export const storyTypeEnum = pgEnum("story_type", ["personal", "community"])

/* TABLES */

// Users (updated with new fields)
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  dob: date("dob").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  genderPreference: varchar("genderPreference", { length: 20 }).notNull(),
  preferredAgeMin: integer("preferredAgeMin").notNull(),
  preferredAgeMax: integer("preferredAgeMax").notNull(),
  proximity: varchar("proximity", { length: 20 }).notNull(),
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

// Posts (updated with video support)
export const postsTable = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("userId")
    .notNull()
    .references(() => usersTable.id),
  content: text().notNull(),
  image: varchar("image", { length: 500 }),
  video: varchar("video", { length: 500 }), // Added video column
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
