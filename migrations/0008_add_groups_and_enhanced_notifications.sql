-- Add Groups functionality and enhance notifications

-- Groups table
CREATE TABLE IF NOT EXISTS "groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"description" text,
	"image" varchar(500),
	"created_by" uuid NOT NULL,
	"post_id" integer,
	"is_active" integer DEFAULT 1 NOT NULL,
	"max_members" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Group Members table
CREATE TABLE IF NOT EXISTS "group_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

-- Group Messages table
CREATE TABLE IF NOT EXISTS "group_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group_id" integer NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"attachment_url" text,
	"attachment_type" varchar(50),
	"attachment_name" varchar(255),
	"attachment_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Group Stories table
CREATE TABLE IF NOT EXISTS "group_stories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_stories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text,
	"image" varchar(500),
	"video" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);

-- Group Story Views table
CREATE TABLE IF NOT EXISTS "group_story_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_story_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"story_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);

-- Add action_url column to notifications table
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_url" varchar(500);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "groups" ADD CONSTRAINT "groups_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_stories" ADD CONSTRAINT "group_stories_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_stories" ADD CONSTRAINT "group_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_story_views" ADD CONSTRAINT "group_story_views_story_id_group_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "group_stories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_story_views" ADD CONSTRAINT "group_story_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "groups_created_by_idx" ON "groups" ("created_by");
CREATE INDEX IF NOT EXISTS "groups_post_id_idx" ON "groups" ("post_id");
CREATE INDEX IF NOT EXISTS "group_members_group_id_idx" ON "group_members" ("group_id");
CREATE INDEX IF NOT EXISTS "group_members_user_id_idx" ON "group_members" ("user_id");
CREATE INDEX IF NOT EXISTS "group_messages_group_id_idx" ON "group_messages" ("group_id");
CREATE INDEX IF NOT EXISTS "group_messages_created_at_idx" ON "group_messages" ("created_at");
CREATE INDEX IF NOT EXISTS "group_stories_group_id_idx" ON "group_stories" ("group_id");
CREATE INDEX IF NOT EXISTS "group_stories_expires_at_idx" ON "group_stories" ("expires_at");