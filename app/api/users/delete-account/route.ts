import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  usersTable,
  userTagsTable,
  thoughtsTable,
  postsTable,
  postLikesTable,
  postCommentsTable,
  postSharesTable,
  postInvitesTable,
  inviteRequestsTable,
  postInviteParticipantsTable,
  followersTable,
  profileVisitorsTable,
  userSettingsTable,
  messagesTable,
  albumsTable,
  albumContributorsTable,
  albumImagesTable,
  albumImageLikesTable,
  albumSharesTable,
  albumJoinRequestsTable,
  albumImageCommentsTable,
  locationRequestsTable,
  postLocationsTable,
  groupsTable,
  groupMembersTable,
  groupMessagesTable,
  storiesTable,
  storyViewsTable,
  groupStoriesTable,
  groupStoryViewsTable,
  notificationsTable,
  communitiesTable,
  communityMembersTable
} from "@/src/db/schema"
import { eq, or } from "drizzle-orm"

// DELETE - Delete user account and all associated data
export async function DELETE(request: NextRequest) {
  try {
    console.log("=== DELETE ACCOUNT API START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("Deleting account for user:", userId)

    // Verify the request has confirmation
    const { confirmText } = await request.json()
    if (confirmText !== "DELETE MY ACCOUNT") {
      return NextResponse.json({ 
        error: "Invalid confirmation text. Please type 'DELETE MY ACCOUNT' exactly." 
      }, { status: 400 })
    }

    // Start transaction to ensure all-or-nothing deletion
    const result = await db.transaction(async (tx) => {
      console.log("Starting account deletion transaction...")

      // 1. Delete user tags
      await tx.delete(userTagsTable).where(eq(userTagsTable.userId, userId))
      console.log("✅ Deleted user tags")

      // 2. Delete thoughts
      await tx.delete(thoughtsTable).where(eq(thoughtsTable.userId, userId))
      console.log("✅ Deleted thoughts")

      // 3. Get user's posts to delete related data
      const userPosts = await tx.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.userId, userId))
      const postIds = userPosts.map(post => post.id)
      
      if (postIds.length > 0) {
        // Delete post-related data
        await tx.delete(postLikesTable).where(eq(postLikesTable.userId, userId))
        await tx.delete(postCommentsTable).where(eq(postCommentsTable.userId, userId))
        await tx.delete(postSharesTable).where(eq(postSharesTable.userId, userId))
        
        // Delete post invites and related data
        for (const postId of postIds) {
          await tx.delete(inviteRequestsTable).where(eq(inviteRequestsTable.postId, postId))
          await tx.delete(postInviteParticipantsTable).where(
            eq(postInviteParticipantsTable.userId, userId)
          )
          await tx.delete(postInvitesTable).where(eq(postInvitesTable.postId, postId))
          await tx.delete(postLocationsTable).where(eq(postLocationsTable.postId, postId))
        }
        console.log("✅ Deleted post-related data")
      }

      // 4. Delete posts
      await tx.delete(postsTable).where(eq(postsTable.userId, userId))
      console.log("✅ Deleted posts")

      // 5. Delete follower relationships
      await tx.delete(followersTable).where(
        or(
          eq(followersTable.followerId, userId),
          eq(followersTable.followingId, userId)
        )
      )
      console.log("✅ Deleted follower relationships")

      // 6. Delete profile visitors data
      await tx.delete(profileVisitorsTable).where(
        or(
          eq(profileVisitorsTable.profileId, userId),
          eq(profileVisitorsTable.visitorId, userId)
        )
      )
      console.log("✅ Deleted profile visitors data")

      // 7. Delete user settings
      await tx.delete(userSettingsTable).where(eq(userSettingsTable.userId, userId))
      console.log("✅ Deleted user settings")

      // 8. Delete messages
      await tx.delete(messagesTable).where(
        or(
          eq(messagesTable.senderId, userId),
          eq(messagesTable.receiverId, userId)
        )
      )
      console.log("✅ Deleted messages")

      // 9. Get user's albums and delete related data
      const userAlbums = await tx.select({ id: albumsTable.id }).from(albumsTable).where(eq(albumsTable.creatorId, userId))
      const albumIds = userAlbums.map(album => album.id)
      
      if (albumIds.length > 0) {
        for (const albumId of albumIds) {
          // Get album images to delete their likes and comments
          const albumImages = await tx.select({ id: albumImagesTable.id }).from(albumImagesTable).where(eq(albumImagesTable.albumId, albumId))
          const imageIds = albumImages.map(img => img.id)
          
          if (imageIds.length > 0) {
            for (const imageId of imageIds) {
              await tx.delete(albumImageLikesTable).where(eq(albumImageLikesTable.imageId, imageId))
              await tx.delete(albumImageCommentsTable).where(eq(albumImageCommentsTable.imageId, imageId))
            }
          }
          
          await tx.delete(albumImagesTable).where(eq(albumImagesTable.albumId, albumId))
          await tx.delete(albumContributorsTable).where(eq(albumContributorsTable.albumId, albumId))
          await tx.delete(albumSharesTable).where(eq(albumSharesTable.albumId, albumId))
          await tx.delete(albumJoinRequestsTable).where(eq(albumJoinRequestsTable.albumId, albumId))
        }
      }

      // Delete user's album contributions
      await tx.delete(albumContributorsTable).where(eq(albumContributorsTable.userId, userId))
      await tx.delete(albumImagesTable).where(eq(albumImagesTable.contributorId, userId))
      await tx.delete(albumImageLikesTable).where(eq(albumImageLikesTable.userId, userId))
      await tx.delete(albumImageCommentsTable).where(eq(albumImageCommentsTable.userId, userId))
      await tx.delete(albumSharesTable).where(
        or(
          eq(albumSharesTable.sharedBy, userId),
          eq(albumSharesTable.sharedWith, userId)
        )
      )
      await tx.delete(albumJoinRequestsTable).where(eq(albumJoinRequestsTable.userId, userId))

      // Delete albums
      await tx.delete(albumsTable).where(eq(albumsTable.creatorId, userId))
      console.log("✅ Deleted albums and related data")

      // 10. Delete location requests
      await tx.delete(locationRequestsTable).where(
        or(
          eq(locationRequestsTable.requesterId, userId),
          eq(locationRequestsTable.postOwnerId, userId)
        )
      )
      console.log("✅ Deleted location requests")

      // 11. Get user's groups and delete related data
      const userGroups = await tx.select({ id: groupsTable.id }).from(groupsTable).where(eq(groupsTable.createdBy, userId))
      const groupIds = userGroups.map(group => group.id)
      
      if (groupIds.length > 0) {
        for (const groupId of groupIds) {
          // Get group stories and delete their views
          const groupStories = await tx.select({ id: groupStoriesTable.id }).from(groupStoriesTable).where(eq(groupStoriesTable.groupId, groupId))
          const storyIds = groupStories.map(story => story.id)
          
          if (storyIds.length > 0) {
            for (const storyId of storyIds) {
              await tx.delete(groupStoryViewsTable).where(eq(groupStoryViewsTable.storyId, storyId))
            }
          }
          
          await tx.delete(groupStoriesTable).where(eq(groupStoriesTable.groupId, groupId))
          await tx.delete(groupMessagesTable).where(eq(groupMessagesTable.groupId, groupId))
          await tx.delete(groupMembersTable).where(eq(groupMembersTable.groupId, groupId))
        }
      }

      // Delete user's group memberships and content
      await tx.delete(groupMembersTable).where(eq(groupMembersTable.userId, userId))
      await tx.delete(groupMessagesTable).where(eq(groupMessagesTable.senderId, userId))
      await tx.delete(groupStoriesTable).where(eq(groupStoriesTable.userId, userId))
      await tx.delete(groupStoryViewsTable).where(eq(groupStoryViewsTable.userId, userId))

      // Delete groups
      await tx.delete(groupsTable).where(eq(groupsTable.createdBy, userId))
      console.log("✅ Deleted groups and related data")

      // 12. Get user's stories and delete views
      const userStories = await tx.select({ id: storiesTable.id }).from(storiesTable).where(eq(storiesTable.userId, userId))
      const userStoryIds = userStories.map(story => story.id)
      
      if (userStoryIds.length > 0) {
        for (const storyId of userStoryIds) {
          await tx.delete(storyViewsTable).where(eq(storyViewsTable.storyId, storyId))
        }
      }

      // Delete user's story views and stories
      await tx.delete(storyViewsTable).where(eq(storyViewsTable.userId, userId))
      await tx.delete(storiesTable).where(eq(storiesTable.userId, userId))
      console.log("✅ Deleted stories and related data")

      // 13. Get user's communities and delete related data
      const userCommunities = await tx.select({ id: communitiesTable.id }).from(communitiesTable).where(eq(communitiesTable.createdBy, userId))
      const communityIds = userCommunities.map(community => community.id)
      
      if (communityIds.length > 0) {
        for (const communityId of communityIds) {
          await tx.delete(communityMembersTable).where(eq(communityMembersTable.communityId, communityId))
        }
      }

      // Delete user's community memberships
      await tx.delete(communityMembersTable).where(eq(communityMembersTable.userId, userId))

      // Delete communities
      await tx.delete(communitiesTable).where(eq(communitiesTable.createdBy, userId))
      console.log("✅ Deleted communities and related data")

      // 14. Delete notifications
      await tx.delete(notificationsTable).where(
        or(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.fromUserId, userId)
        )
      )
      console.log("✅ Deleted notifications")

      // 15. Finally, delete the user account
      await tx.delete(usersTable).where(eq(usersTable.id, userId))
      console.log("✅ Deleted user account")

      return { success: true }
    })

    console.log("✅ Account deletion completed successfully")
    console.log("=== DELETE ACCOUNT API END ===")

    return NextResponse.json({ 
      success: true, 
      message: "Account and all associated data have been permanently deleted." 
    })

  } catch (error) {
    console.error("❌ Account deletion error:", error)
    return NextResponse.json({ 
      error: "Failed to delete account. Please try again or contact support.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}