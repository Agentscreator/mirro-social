# Events System

The events system has been updated to use real data from the database instead of mock data.

## Database Structure

Events are stored in the `live_events` table with the following key fields:
- `id`: Unique event identifier
- `postId`: Associated post ID (events are linked to posts)
- `userId`: Event creator/host ID
- `title`: Event title
- `description`: Event description
- `scheduledStartTime`: When the event is scheduled to start
- `scheduledEndTime`: When the event is scheduled to end
- `status`: Event status ('scheduled', 'live', 'ended', 'cancelled')
- `currentParticipants`: Number of current participants
- `maxParticipants`: Maximum allowed participants
- `location`: Event location

## API Endpoints

### GET /api/events
Fetches events based on type parameter:
- `all`: All events (scheduled, live, ended)
- `upcoming`: Future events only
- `attending`: Events the user is participating in
- `hosting`: Events the user is hosting

### Event Creation
Events are created through the post creation system (`/api/posts`) when a post includes event details.

## Frontend Features

The events page (`/events`) includes:
- Real-time event data from the database
- Filtering by event type (all, upcoming, attending, hosting)
- Search functionality
- Event cards showing key details
- Host and participant information
- Responsive design with loading states

## Adding Sample Data

To add sample events for testing, you can run:
```bash
node scripts/seed-events.js
```

This will create sample events linked to existing posts and users in your database.

## Event Participation

Users can join events through the `live_event_participants` table, which tracks:
- Event participation
- Join/leave timestamps
- Host status