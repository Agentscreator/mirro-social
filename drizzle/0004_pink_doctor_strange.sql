ALTER TABLE "post_invites" ADD COLUMN "invite_description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "community_name" varchar(100);--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "auto_accept_invites";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "group_name";