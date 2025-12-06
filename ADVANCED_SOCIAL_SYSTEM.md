# Advanced Social System - Complete Documentation

## Overview
Complete social system for Quest with guild feeds, media sharing, group challenges, weekly leaderboards, and real-time notifications.

## Backend (Migration 036) ✅ COMPLETE

### 1. Enhanced Guilds Table
Extended existing `guilds` table with:
- `cover_image_url`: Guild banner image
- `guild_type`: 'open', 'closed', 'private'
- `weekly_xp_goal`: Target XP for the week
- `current_week_xp`: Running total for current week
- `guild_level`: Overall guild progression
- `total_guild_xp`: Lifetime guild XP
- `tags`: Array of guild tags/interests
- `rules`: Guild rules/guidelines
- `welcome_message`: Message for new members

### 2. Guild Posts (Feed System)
WhatsApp-style group feed where members can post:
- **Text posts**: Share updates, thoughts
- **Image posts**: Photos with captions
- **Video posts**: Short videos
- **Achievement posts**: Celebrate completed challenges
- **Poll posts**: Vote on guild decisions

**Table**: `guild_posts`
- Fields: type, content, image_url, video_url, achievement_data, poll_options, visibility
- Auto-timestamps and soft delete support

### 3. Engagement System
**Likes**: `guild_post_likes`
- Track who liked each post
- Auto-update like counts via triggers
- Real-time updates via Supabase Realtime

**Comments**: `guild_post_comments`
- Threaded comments on posts
- Auto-update comment counts
- Real-time comment streams

### 4. Group Challenges
Enhanced existing `guild_challenges` table:
- **challenge_type**: 
  - `collective`: Everyone contributes to shared goal
  - `individual`: Personal goals within guild
  - `team_vs_team`: Guild split into competing teams
- **goal_type**: 'total_xp', 'quest_completions', 'habit_streaks', 'custom'
- **status**: 'pending', 'active', 'completed', 'failed', 'cancelled'
- **Rewards**: XP, coins, badges

**Participants**: `guild_challenge_participants`
- Track individual contributions
- Progress tracking
- Completion status

### 5. Weekly Leaderboard
Auto-resetting competitive rankings:
- **Table**: `guild_weekly_leaderboard`
- Tracks XP earned per week per member
- Automatic rank calculation
- Resets every Monday 00:00 UTC
- Historical tracking of past weeks

**Functions**:
- `update_guild_leaderboard(user_id, guild_id, xp_gained)`: Update after XP gain
- `update_guild_leaderboard_ranks(guild_id, week_start)`: Recalculate ranks

### 6. Notification System
Comprehensive in-app notifications:
- **Types**: 'guild_invite', 'new_post', 'post_like', 'post_comment', 'challenge_start', 'challenge_complete', 'level_up', 'achievement'
- **Table**: `notifications`
- Fields: title, message, type, action_url, is_read
- Auto-mark as read functionality

**Function**: `create_notification(user_id, type, title, message, action_url)`

### 7. Media Management
Track all uploaded files:
- **Table**: `media_uploads`
- File tracking: filename, file_size, mime_type, storage_path
- Usage tracking: used_in_type, used_in_id
- Automatic cleanup support

### 8. Feed Function
**`get_guild_feed(p_guild_id, p_limit, p_offset)`**
- Returns posts with engagement counts
- Includes author profile data
- Ordered by latest first
- Pagination support
- Optimized with indexes

## Database Features

### Triggers
1. **Auto-update like counts**: Increment/decrement on like add/remove
2. **Auto-update comment counts**: Increment/decrement on comment add/remove
3. **Guild XP updates**: Auto-call leaderboard update function

### Indexes (Performance Optimized)
- `idx_guild_posts_guild`: Fast feed retrieval
- `idx_guild_post_likes_post`: Quick like counts
- `idx_guild_post_comments_post`: Efficient comment loading
- `idx_guild_challenges_guild`: Challenge queries
- `idx_guild_leaderboard_week`: Leaderboard sorting
- `idx_notifications_unread`: Unread notification badge

### RLS Policies (Security)
- **Guild Posts**: Members can read, only author can update/delete
- **Likes/Comments**: Users can create their own, read all in guild
- **Challenges**: Guild members can participate
- **Leaderboard**: Read-only for guild members
- **Notifications**: Users can only see their own

## Frontend Implementation Needed

### 1. GuildFeedScreen
**Priority: HIGH**
- [ ] Create `app/src/screens/guilds/GuildFeedScreen.tsx`
- [ ] WhatsApp-style feed interface
- [ ] Post types: text, image, video, achievement, poll
- [ ] Like button with count animation
- [ ] Comment section with replies
- [ ] Pull-to-refresh
- [ ] Infinite scroll pagination
- [ ] Real-time updates (Supabase Realtime)

**Components Needed**:
- `PostCard`: Main post display component
- `PostComposer`: Create new posts (with media picker)
- `LikeButton`: Interactive like button
- `CommentSection`: Comment list with input
- `MediaViewer`: Full-screen image/video viewer
- `PollCard`: Interactive poll component

### 2. Guild Challenges
**Priority: HIGH**
- [ ] Challenge creation modal (guild leaders)
- [ ] Active challenges list
- [ ] Challenge detail screen with progress bars
- [ ] Participant list with contributions
- [ ] Challenge completion celebration

**UI Elements**:
- Progress bars (collective challenges)
- Individual contribution cards
- Team vs Team scoreboard
- Countdown timer
- Completion animation

### 3. Weekly Leaderboard
**Priority: MEDIUM**
- [ ] Leaderboard tab in guild screen
- [ ] Top 10 list with ranks
- [ ] User's current rank highlight
- [ ] XP progress bars
- [ ] Weekly reset countdown
- [ ] Historical weeks view

**Design**:
- Gold/Silver/Bronze medals for top 3
- Animated rank changes
- Personal best indicator
- Week-to-week comparison

### 4. Notifications Screen
**Priority: MEDIUM**
- [ ] Create `app/src/screens/main/NotificationsScreen.tsx`
- [ ] Notification list with icons
- [ ] Mark as read on tap
- [ ] Mark all as read button
- [ ] Navigate to action_url on tap
- [ ] Real-time badge update in tab bar

**Notification Types**:
- Guild invite (navigate to guild)
- New post (navigate to feed)
- Like/Comment (navigate to post)
- Challenge start/complete (navigate to challenge)

### 5. Media Upload System
**Priority: HIGH**
- [ ] Image picker integration (expo-image-picker)
- [ ] Video picker
- [ ] Upload progress indicator
- [ ] Image compression before upload
- [ ] Video thumbnail generation
- [ ] Supabase Storage integration

**Functions Needed**:
```typescript
uploadMedia(file: File, type: 'image' | 'video'): Promise<string>
deleteMedia(path: string): Promise<void>
getMediaUrl(path: string): string
```

### 6. Enhanced Guild Profile
**Priority: LOW**
- [ ] Add cover image upload
- [ ] Display guild stats (level, total XP)
- [ ] Show weekly XP progress
- [ ] Display guild tags
- [ ] Guild rules section
- [ ] Welcome message for new members

## Real-time Features (Supabase Realtime)

### Subscriptions Needed
```typescript
// Guild feed real-time
supabase
  .channel(`guild-${guildId}-feed`)
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'guild_posts', filter: `guild_id=eq.${guildId}` },
    handleNewPost
  )
  .subscribe()

// Notifications real-time
supabase
  .channel(`user-${userId}-notifications`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    handleNewNotification
  )
  .subscribe()

// Leaderboard updates
supabase
  .channel(`guild-${guildId}-leaderboard`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'guild_weekly_leaderboard', filter: `guild_id=eq.${guildId}` },
    handleLeaderboardUpdate
  )
  .subscribe()
```

## API Functions Needed

### Guild Feed
```typescript
async function getGuildFeed(guildId: string, page: number = 0): Promise<Post[]>
async function createPost(guildId: string, post: CreatePostData): Promise<Post>
async function likePost(postId: string): Promise<void>
async function unlikePost(postId: string): Promise<void>
async function commentOnPost(postId: string, content: string): Promise<Comment>
async function deletePost(postId: string): Promise<void>
```

### Challenges
```typescript
async function getGuildChallenges(guildId: string): Promise<Challenge[]>
async function createChallenge(guildId: string, challenge: CreateChallengeData): Promise<Challenge>
async function joinChallenge(challengeId: string): Promise<void>
async function updateChallengeProgress(challengeId: string, progress: number): Promise<void>
```

### Leaderboard
```typescript
async function getWeeklyLeaderboard(guildId: string, weekStart?: Date): Promise<LeaderboardEntry[]>
async function getMyRank(guildId: string): Promise<LeaderboardEntry>
```

### Notifications
```typescript
async function getNotifications(userId: string): Promise<Notification[]>
async function markAsRead(notificationId: string): Promise<void>
async function markAllAsRead(userId: string): Promise<void>
```

## User Experience Flow

### Posting to Guild Feed
1. User taps "+" button in guild feed
2. Post composer modal opens
3. User selects post type (text/image/video/poll)
4. For media: Pick from gallery or camera
5. Add caption/text
6. Tap "Post"
7. Upload media (with progress bar)
8. Create post in database
9. Post appears instantly in feed (optimistic update)
10. Real-time sync to all guild members

### Participating in Challenge
1. User views active guild challenges
2. Taps challenge to see details
3. Progress bar shows collective/individual progress
4. User completes relevant quests/activities
5. Progress auto-updates via backend triggers
6. Challenge completion triggers celebration
7. Rewards distributed to all participants

### Weekly Competition
1. Week starts Monday 00:00 UTC
2. All XP gains count toward leaderboard
3. Real-time rank updates as members earn XP
4. Sunday evening: "Last day to climb!" notification
5. Monday morning: Week ends, rewards distributed
6. New week starts, leaderboard resets
7. Previous week archived for viewing

## Testing Checklist
- [ ] Create guild post (text)
- [ ] Create guild post (image)
- [ ] Create guild post (video)
- [ ] Like/unlike posts
- [ ] Comment on posts
- [ ] Delete own posts
- [ ] Create guild challenge
- [ ] Join challenge
- [ ] Complete challenge
- [ ] View leaderboard
- [ ] Receive notifications
- [ ] Real-time feed updates
- [ ] Real-time notification badge
- [ ] Media upload/delete
- [ ] Weekly leaderboard reset

## Future Enhancements
1. **Reactions**: Beyond likes - 😂 💪 🔥 👏 ❤️
2. **Post sharing**: Share posts to other guilds
3. **Mentions**: @username notifications
4. **Hashtags**: #challenges #motivation
5. **Voice messages**: Audio posts
6. **Live streams**: Guild events
7. **Guild events**: Calendar with RSVP
8. **Sub-guilds**: Organized guild chapters
9. **Guild merch**: Custom badges, titles
10. **Guild vs Guild**: Inter-guild competitions

## Performance Considerations
- Use infinite scroll with virtualization for feeds
- Cache media URLs for 24 hours
- Lazy load images with placeholders
- Debounce real-time updates (max 1/second)
- Optimize image uploads (max 2MB, compress)
- Limit video uploads (max 60 seconds, 50MB)
- Use CDN for media delivery (Supabase Storage)

## Conclusion
The backend for the complete social system is now live! All tables, functions, triggers, and RLS policies are in place. Next step is building the frontend UI components to bring these features to life for users.

**Status**: Backend ✅ | Frontend ⏳ | Testing ⏳
