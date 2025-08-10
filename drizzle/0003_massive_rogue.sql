CREATE TABLE "group_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
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
--> statement-breakpoint
CREATE TABLE "group_stories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_stories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text,
	"image" varchar(500),
	"video" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_story_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_story_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"story_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
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
--> statement-breakpoint
CREATE TABLE "post_invite_participants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_invite_participants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invite_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_invite_request_id_invite_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_location_request_id_location_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_type" varchar(20) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_type" varchar(50);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_name" varchar(255);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_size" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "data" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_url" varchar(500);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "auto_accept_invites" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "group_name" varchar(100);--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_stories" ADD CONSTRAINT "group_stories_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_stories" ADD CONSTRAINT "group_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_story_views" ADD CONSTRAINT "group_story_views_story_id_group_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."group_stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_story_views" ADD CONSTRAINT "group_story_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_invite_participants" ADD CONSTRAINT "post_invite_participants_invite_id_post_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."post_invites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_invite_participants" ADD CONSTRAINT "post_invite_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "post_id";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "invite_request_id";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "location_request_id";