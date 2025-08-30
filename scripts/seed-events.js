const { drizzle } = require('drizzle-orm/postgres-js')
const postgres = require('postgres')
const { liveEventsTable, postsTable, usersTable } = require('../src/db/schema')

// Database connection
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

async function seedEvents() {
  try {
    console.log('🌱 Seeding sample events...')

    // First, get some existing users and posts to link events to
    const users = await db.select().from(usersTable).limit(5)
    const posts = await db.select().from(postsTable).limit(10)

    if (users.length === 0 || posts.length === 0) {
      console.log('⚠️  No users or posts found. Please create some users and posts first.')
      return
    }

    const sampleEvents = [
      {
        postId: posts[0]?.id,
        userId: users[0]?.id,
        title: 'Weekend Hiking Adventure',
        description: 'Join us for a scenic hike through the mountains. We\'ll explore beautiful trails, enjoy nature, and have a great time together!',
        scheduledStartTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        scheduledEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        maxParticipants: 20,
        location: 'Blue Ridge Mountains',
        status: 'scheduled'
      },
      {
        postId: posts[1]?.id,
        userId: users[1]?.id,
        title: 'Coffee & Code Meetup',
        description: 'Casual coding session with fellow developers. Bring your laptop and let\'s work on some projects together!',
        scheduledStartTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        scheduledEndTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        maxParticipants: 15,
        location: 'Downtown Coffee Shop',
        status: 'scheduled'
      },
      {
        postId: posts[2]?.id,
        userId: users[2]?.id,
        title: 'Photography Walk',
        description: 'Explore the city and capture beautiful moments. Perfect for beginners and experienced photographers alike!',
        scheduledStartTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        scheduledEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        maxParticipants: 999999,
        location: 'City Center',
        status: 'scheduled'
      },
      {
        postId: posts[3]?.id,
        userId: users[3]?.id,
        title: 'Book Club Discussion',
        description: 'Monthly book club meeting to discuss our latest read. This month we\'re covering "The Midnight Library".',
        scheduledStartTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        scheduledEndTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        maxParticipants: 25,
        location: 'Local Library',
        status: 'scheduled'
      },
      {
        postId: posts[4]?.id,
        userId: users[4]?.id || users[0]?.id,
        title: 'Yoga in the Park',
        description: 'Start your weekend with a relaxing yoga session in the park. All levels welcome!',
        scheduledStartTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        scheduledEndTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        maxParticipants: 30,
        location: 'Central Park',
        status: 'scheduled'
      }
    ]

    // Insert sample events
    for (const event of sampleEvents) {
      if (event.postId && event.userId) {
        await db.insert(liveEventsTable).values(event)
        console.log(`✅ Created event: ${event.title}`)
      }
    }

    console.log('🎉 Sample events seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding events:', error)
  } finally {
    await client.end()
  }
}

seedEvents()