# Retention Cohort Tracking System

A comprehensive backend system for tracking user retention through intelligent cohort analysis and AI-powered recommendations.

## Overview

This system implements a sophisticated multi-tier recommendation engine that tracks user engagement patterns and provides personalized user recommendations based on thought similarity, community connections, and behavioral cohorts.

## Architecture

### Core Components

1. **Recommendation Service** (`src/lib/recommendationService.ts`)
   - Multi-tier recommendation algorithm
   - Pinecone vector similarity matching
   - Community-based fallback recommendations
   - Pagination and scoring system

2. **Database Schema**
   - Users table with profile data
   - Thoughts table with embeddings
   - Communities and memberships
   - Followers/following relationships
   - Tags and user preferences

3. **Vector Database Integration**
   - Pinecone for semantic similarity
   - OpenAI embeddings for thought content
   - Real-time similarity scoring

## Recommendation Tiers

### Tier 1: AI-Powered Similarity (Highest Quality)
- **Condition**: Current user has thought embeddings
- **Method**: Pinecone vector similarity search
- **Features**:
  - Semantic matching based on thought content
  - Real-time similarity scores (0.0 - 1.0)
  - Proximity-based filtering
  - AI-generated explanations for matches

### Tier 2: Narrative Recommendations (Medium Quality)
- **Condition**: Target users have embeddings, current user doesn't
- **Method**: Diverse sampling of users with rich content
- **Features**:
  - Content-rich user discovery
  - Narrative-based matching explanations
  - Encourages engagement with thoughtful users

### Tier 3: Community-Based Matching (Baseline Quality)
- **Condition**: Fallback when embeddings unavailable
- **Method**: Shared communities and tag matching
- **Features**:
  - Community overlap scoring (3x weight)
  - Tag similarity matching (1x weight)
  - Demographic compatibility

## Cohort Tracking Methodology

### User Segmentation

```typescript
// Cohort categories based on engagement patterns
enum UserCohort {
  POWER_USERS,      // High thought count + embeddings
  ENGAGED_USERS,    // Regular thoughts, some embeddings
  COMMUNITY_USERS,  // Active in communities, few thoughts
  NEW_USERS,        // Recent signups, minimal activity
  DORMANT_USERS     // Low recent activity
}
```

### Engagement Metrics

1. **Thought Quality Score**
   - Content length (minimum 10 characters)
   - Embedding availability
   - Recency of posts

2. **Community Participation**
   - Number of communities joined
   - Activity within communities
   - Cross-community connections

3. **Social Graph Density**
   - Following/follower ratios
   - Mutual connections
   - Network clustering coefficient

### Retention Tracking

The system tracks retention through several key indicators:

- **Content Creation Frequency**: How often users post thoughts
- **Embedding Generation**: Whether users create content rich enough for AI processing
- **Community Engagement**: Participation in shared interest groups
- **Social Connections**: Building and maintaining follower relationships

## Implementation Details

### Recommendation Algorithm Flow

```typescript
async function getRecommendations(userId: string, page = 1, pageSize = 5) {
  // 1. Check user's embedding status
  const hasEmbeddings = await userHasEmbeddings(userId);
  
  // 2. Try Pinecone similarity (Tier 1)
  if (hasEmbeddings && pineconeAvailable) {
    return await getThoughtBasedRecommendations(userId, pageSize);
  }
  
  // 3. Fallback to community matching (Tier 2/3)
  return await getCommunityBasedRecommendations(userId, pageSize);
}
```

### Scoring System

**Thought-Based Similarity**:
- Cosine similarity from Pinecone (0.0 - 1.0)
- Proximity weighting (geographic/temporal)
- Content recency bonus

**Community-Based Scoring**:
```typescript
const score = (sharedCommunities * 3.0) + (commonTags * 1.0) + (thoughtCount * 0.03);
```

**Overall Compatibility**:
```typescript
const compatibility = score / Math.max(userFeatures, matchFeatures);
```

## Cohort Analysis Features

### Retention Metrics

1. **Daily Active Users (DAU)**
   - Users creating thoughts
   - Users engaging with recommendations
   - Community participation

2. **Weekly Retention Cohorts**
   - New user onboarding success
   - Feature adoption rates
   - Churn prediction indicators

3. **Content Quality Progression**
   - Embedding generation rates
   - Thought length trends
   - AI engagement scores

### Behavioral Patterns

- **Onboarding Journey**: New user → Community joining → First thoughts → Embedding generation
- **Engagement Cycles**: Content creation → Recommendations → Social connections → Retention
- **Churn Indicators**: Declining thought frequency, community disengagement, stale embeddings

## Performance Optimizations

### Caching Strategy
- User embedding caching (24-hour TTL)
- Community membership caching
- Recommendation result caching (1-hour TTL)

### Database Optimizations
- Indexed queries on user relationships
- Efficient embedding existence checks
- Paginated result sets with smart prefetching

### Fallback Mechanisms
- Graceful Pinecone failure handling
- Multi-tier recommendation cascading
- Empty state management

## Monitoring and Analytics

### Key Performance Indicators (KPIs)

1. **Recommendation Quality**
   - Click-through rates on recommendations
   - Follow conversion rates
   - User feedback scores

2. **Cohort Health**
   - Retention rates by user tier
   - Feature adoption progression
   - Content quality improvements

3. **System Performance**
   - Pinecone query latency
   - Database query efficiency
   - Cache hit rates

### Alerting Thresholds

- Pinecone availability < 95%
- Recommendation response time > 2s
- Daily cohort retention drop > 10%
- Embedding generation failure rate > 5%

## Configuration

### Environment Variables

```bash
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=mirro-public
PINECONE_INDEX=mirro-public

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_key

# Database Configuration
DATABASE_URL=your_database_url
```

### Recommendation Parameters

```typescript
const CONFIG = {
  MAX_RECOMMENDATIONS: 50,
  DEFAULT_PAGE_SIZE: 5,
  SIMILARITY_THRESHOLD: 0.3,
  COMMUNITY_WEIGHT: 3.0,
  TAG_WEIGHT: 1.0,
  THOUGHT_WEIGHT: 0.03
};
```

## Future Enhancements

### Planned Features

1. **Advanced Cohort Segmentation**
   - Machine learning-based user clustering
   - Predictive churn modeling
   - Personalized retention strategies

2. **Enhanced Recommendation Quality**
   - Multi-modal embeddings (text + metadata)
   - Temporal preference learning
   - Cross-platform behavior tracking

3. **Real-time Analytics**
   - Live cohort dashboards
   - A/B testing framework
   - Recommendation performance tracking

### Scalability Considerations

- Horizontal scaling for Pinecone queries
- Database sharding strategies
- Microservice architecture migration
- Event-driven cohort updates

## Troubleshooting

### Common Issues

1. **No Recommendations Returned**
   - Check Pinecone connectivity
   - Verify user has communities/tags
   - Ensure database connectivity

2. **Poor Recommendation Quality**
   - Review embedding generation process
   - Check community overlap calculations
   - Validate similarity thresholds

3. **Performance Issues**
   - Monitor Pinecone query times
   - Check database query plans
   - Review caching effectiveness

### Debug Commands

```bash
# Check user embedding status
SELECT COUNT(*) FROM thoughts WHERE user_id = ? AND embedding IS NOT NULL;

# Verify community memberships
SELECT c.name FROM communities c 
JOIN community_members cm ON c.id = cm.community_id 
WHERE cm.user_id = ?;

# Test Pinecone connectivity
curl -X POST "https://your-index.pinecone.io/query" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -d '{"vector": [...], "topK": 5}'
```

This cohort tracking system provides a robust foundation for understanding user behavior, improving retention, and delivering personalized experiences that keep users engaged with your platform.