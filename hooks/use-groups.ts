"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

interface GroupStory {
  id: number
  content?: string
  image?: string
  video?: string
  createdAt: string
  expiresAt: string
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  viewCount: number
  hasViewed: boolean
}

interface Group {
  id: number
  name: string
  description?: string
  image?: string
  createdBy: string
  postId?: number
  maxMembers: number
  createdAt: string
  memberRole: string
  memberCount: number
  creator: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  stories?: GroupStory[]
}

export function useGroups() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups || [])
      } else {
        console.error('Failed to fetch groups:', response.status)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const fetchGroupStories = useCallback(async () => {
    if (!session?.user?.id || groups.length === 0) return

    try {
      const groupsWithStories = await Promise.all(
        groups.map(async (group) => {
          try {
            const response = await fetch(`/api/groups/${group.id}/stories`)
            if (response.ok) {
              const data = await response.json()
              return {
                ...group,
                stories: data.stories || []
              }
            }
            return { ...group, stories: [] }
          } catch (error) {
            console.error(`Error fetching stories for group ${group.id}:`, error)
            return { ...group, stories: [] }
          }
        })
      )

      setGroups(groupsWithStories)
    } catch (error) {
      console.error('Error fetching group stories:', error)
    }
  }, [session?.user?.id, groups.length])

  const createGroup = useCallback(async (groupData: {
    name: string
    description?: string
    image?: string
    postId?: number
    maxMembers?: number
  }) => {
    if (!session?.user?.id) return null

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      })

      if (response.ok) {
        const data = await response.json()
        await fetchGroups() // Refresh groups list
        return data.group
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }, [session?.user?.id, fetchGroups])

  const joinGroup = useCallback(async (groupId: number) => {
    if (!session?.user?.id) return false

    try {
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchGroups() // Refresh groups list
        return true
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to join group')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      throw error
    }
  }, [session?.user?.id, fetchGroups])

  // Initial fetch
  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Fetch stories when groups change
  useEffect(() => {
    if (groups.length > 0 && !groups[0].stories) {
      fetchGroupStories()
    }
  }, [groups.length, fetchGroupStories])

  return {
    groups,
    loading,
    fetchGroups,
    fetchGroupStories,
    createGroup,
    joinGroup,
    refetch: fetchGroups,
  }
}