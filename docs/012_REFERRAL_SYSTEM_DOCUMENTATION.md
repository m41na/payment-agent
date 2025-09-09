# Referral System Documentation

## Overview

The Referral System is a comprehensive standalone feature that enables users to refer new customers, earn rewards through a points-based tier system, and boost their product visibility in search rankings. The system is designed to drive user acquisition, increase engagement, and create a network effect within the marketplace.

## Architecture

### Design Philosophy
- **Standalone Feature**: Independent system with its own services, hooks, and database schema
- **Cross-Feature Integration**: Seamlessly integrates with Product Discovery, Payment Processing, and User Profile features
- **Scalable Rewards**: Flexible points and tier system supporting multiple reward types
- **Analytics-Driven**: Comprehensive tracking and reporting capabilities

### Key Components

#### 1. Database Schema
**Five Core Tables**:
- `pg_referral_codes`: User referral codes and usage tracking
- `pg_referral_relationships`: Referrer-referred user connections
- `pg_referral_points`: User points, tiers, and progression tracking
- `pg_referral_conversion_events`: Conversion tracking and point attribution
- `pg_referral_rewards`: Reward management and redemption tracking

#### 2. Service Layer Architecture
- **ReferralService**: Core referral operations and business logic
- **ReferralAnalyticsService**: Comprehensive analytics and reporting
- **Integration Services**: Cross-feature data exchange and synchronization

#### 3. React Hook System
- **useReferrals**: Primary referral management hook
- **useReferralAnalytics**: Analytics and leaderboard management
- **State Management**: Comprehensive loading states and error handling

## Core Functionality

### Referral Code System

#### Code Generation
```typescript
interface ReferralCode {
  id: string;
  user_id: string;
  code: string;              // 8-character unique code
  is_active: boolean;
  usage_count: number;
  usage_limit?: number;      // Optional usage restrictions
  expires_at?: Date;         // Optional expiration
}
```

**Features**:
- **Unique Generation**: Cryptographically secure 8-character codes
- **Usage Limits**: Configurable per-code usage restrictions
- **Expiration Support**: Time-based code validity
- **Activity Tracking**: Real-time usage monitoring

#### Code Validation
- **Uniqueness Enforcement**: Database-level unique constraints
- **Self-Referral Prevention**: Business logic prevents users from using their own codes
- **Duplicate Protection**: Prevents multiple referrals between same users
- **Expiration Handling**: Automatic code deactivation

### Referral Relationship Tracking

#### Relationship Management
```typescript
interface ReferralRelationship {
  id: string;
  referrer_id: string;       // User who shared the code
  referred_id: string;       // User who used the code
  referral_code: string;     // Code used for tracking
  status: ReferralStatus;    // ACTIVE, INACTIVE, EXPIRED
  created_at: Date;
}
```

**Business Rules**:
- **One-to-One Mapping**: Each user can only be referred once
- **Bidirectional Prevention**: Users cannot refer each other mutually
- **Status Lifecycle**: Active tracking with status transitions
- **Audit Trail**: Complete relationship history

### Points and Tier System

#### Tier Structure
```typescript
enum ReferralTier {
  BRONZE = 'BRONZE',     // 0-99 points
  SILVER = 'SILVER',     // 100-499 points
  GOLD = 'GOLD',         // 500-1,999 points
  PLATINUM = 'PLATINUM', // 2,000-9,999 points
  DIAMOND = 'DIAMOND'    // 10,000+ points
}
```

#### Points Management
```typescript
interface ReferralPoints {
  user_id: string;
  total_points: number;      // Current available points
  lifetime_points: number;   // All-time earned points
  current_tier: ReferralTier;
  tier_progress: number;     // Progress to next tier (0-100%)
}
```

**Point Earning Events**:
- **Signup**: 10 points for successful referral signup
- **First Purchase**: 50 points when referred user makes first purchase
- **Subscription**: 100 points for subscription conversions
- **Milestone Reached**: Variable points for achievement milestones

### Conversion Event Tracking

#### Event Types and Rewards
```typescript
enum ReferralEventType {
  SIGNUP = 'SIGNUP',                    // 10 points
  FIRST_PURCHASE = 'FIRST_PURCHASE',    // 50 points
  SUBSCRIPTION = 'SUBSCRIPTION',        // 100 points
  MILESTONE_REACHED = 'MILESTONE_REACHED' // Variable points
}
```

#### Conversion Attribution
- **Event Deduplication**: Prevents multiple rewards for same event
- **Metadata Tracking**: Rich context for conversion events
- **Attribution Windows**: Configurable time limits for conversions
- **Fraud Prevention**: Validation and abuse detection

## Service Layer Implementation

### ReferralService Core Methods

#### Referral Code Operations
```typescript
class ReferralService {
  // Generate or retrieve user's referral code
  async generateReferralCode(userId: string, request?: ReferralCodeRequest)
  
  // Process new user signup with referral code
  async processReferralSignup(request: ReferralSignupRequest)
  
  // Award points for conversion events
  async awardConversionPoints(referralId: string, eventType: ReferralEventType, metadata?)
  
  // Get user's referral statistics
  async getReferralStats(userId: string)
  
  // Bulk referral data for sorting integration
  async getReferralDataForUsers(userIds: string[])
}
```

#### Business Logic Features
- **Atomic Operations**: Database transactions for consistency
- **Validation Layer**: Comprehensive input validation
- **Error Handling**: Detailed error codes and messages
- **Performance Optimization**: Bulk operations and caching

### ReferralAnalyticsService

#### Analytics Capabilities
```typescript
class ReferralAnalyticsService {
  // Comprehensive system analytics
  async getReferralAnalytics(): Promise<ReferralAnalytics>
  
  // User leaderboard with rankings
  async getReferralLeaderboard(limit?: number): Promise<ReferralLeaderboard[]>
}
```

#### Analytics Data Structure
```typescript
interface ReferralAnalytics {
  total_users_with_referrals: number;
  total_referral_relationships: number;
  total_points_distributed: number;
  conversion_rates_by_event: Record<ReferralEventType, number>;
  tier_distribution: Record<ReferralTier, number>;
  monthly_growth: MonthlyGrowthData[];
  top_referrers: ReferralLeaderboard[];
}
```

## React Hook System

### useReferrals Hook

#### State Management
```typescript
interface UseReferralsState {
  // Referral Code State
  referralCode: ReferralCode | null;
  referralCodeLoading: boolean;
  referralCodeError: ReferralError | null;
  
  // Referral Stats State
  referralStats: ReferralStats | null;
  referralStatsLoading: boolean;
  referralStatsError: ReferralError | null;
  
  // Operation State
  operationLoading: boolean;
  operationError: ReferralError | null;
}
```

#### Hook Operations
```typescript
const {
  // State
  referralCode, referralStats, operationLoading,
  
  // Actions
  generateReferralCode, processReferralSignup, awardConversionPoints,
  refreshReferralStats, getUserReferralData
} = useReferrals(userId);
```

### useReferralAnalytics Hook

#### Analytics Management
```typescript
const {
  // Analytics State
  analytics, analyticsLoading, analyticsError,
  
  // Leaderboard State
  leaderboard, leaderboardLoading, leaderboardError,
  
  // Actions
  refreshAnalytics, refreshLeaderboard, clearErrors
} = useReferralAnalytics();
```

## Database Implementation

### Schema Design

#### Referral Codes Table
```sql
CREATE TABLE pg_referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER DEFAULT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Referral Points Table
```sql
CREATE TABLE pg_referral_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    current_tier VARCHAR(20) DEFAULT 'BRONZE',
    tier_progress DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### Automated Tier Management
```sql
CREATE OR REPLACE FUNCTION update_referral_tier()
RETURNS TRIGGER AS $$
DECLARE
    tier_thresholds INTEGER[] := ARRAY[0, 100, 500, 2000, 10000];
    tier_names VARCHAR(20)[] := ARRAY['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
BEGIN
    -- Automatic tier calculation and progress tracking
    -- Updates tier and progress percentage
END;
$$ LANGUAGE plpgsql;
```

#### Bulk Data Retrieval
```sql
CREATE OR REPLACE FUNCTION get_referral_data_for_users(user_ids UUID[])
RETURNS TABLE (user_id UUID, total_points INTEGER, current_tier VARCHAR(20))
AS $$
BEGIN
    -- Optimized bulk referral data retrieval for sorting service
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Security Implementation

#### Row Level Security (RLS)
- **User Data Protection**: Users can only access their own referral data
- **Referral Visibility**: Users can view referrals they're involved in
- **Service Role Access**: Full system access for backend operations
- **Analytics Permissions**: Controlled access to aggregate data

#### Data Privacy
- **PII Protection**: Sensitive data encrypted and access-controlled
- **Audit Logging**: Complete operation history tracking
- **GDPR Compliance**: User data deletion and export capabilities

## Integration Points

### Product Discovery Integration

#### Listing Boost Algorithm
```typescript
// Referral points influence product ranking
const referralScore = Math.log(referralPoints + 1) / Math.log(maxPoints + 1);
const compositeScore = proximityScore * 0.5 + priceScore * 0.3 + referralScore * 0.2;
```

**Integration Features**:
- **Real-time Data**: Fresh referral points for accurate scoring
- **Bulk Operations**: Efficient data retrieval for large product sets
- **Fallback Handling**: Graceful degradation when referral data unavailable

### Payment Processing Integration

#### Conversion Tracking
```typescript
// Award referral points on successful payments
const paymentResult = await processPayment(paymentIntent);
if (paymentResult.success && userReferralId) {
  await awardConversionPoints(userReferralId, ReferralEventType.FIRST_PURCHASE);
}
```

### User Profile Integration

#### Profile Enhancement
- **Referral Code Display**: User's personal referral code
- **Statistics Dashboard**: Referral performance metrics
- **Tier Badges**: Visual tier representation
- **Progress Indicators**: Tier advancement tracking

## Usage Examples

### Basic Referral Operations

#### Generate Referral Code
```typescript
const { generateReferralCode, referralCode } = useReferrals(userId);

useEffect(() => {
  generateReferralCode();
}, [userId]);

// Share referral code
const shareCode = () => {
  Share.share({
    message: `Join using my referral code: ${referralCode?.code}`,
    url: `https://app.example.com/signup?ref=${referralCode?.code}`
  });
};
```

#### Process Referral Signup
```typescript
const { processReferralSignup } = useReferrals();

const handleSignup = async (signupData) => {
  const result = await processReferralSignup({
    new_user_id: signupData.userId,
    referral_code: signupData.referralCode,
    signup_metadata: signupData.metadata
  });
  
  if (result.success) {
    // Referral relationship created successfully
    showSuccessMessage('Welcome! Your referrer will earn points.');
  }
};
```

#### Award Conversion Points
```typescript
const { awardConversionPoints } = useReferrals();

// Award points for first purchase
const handleFirstPurchase = async (userId, purchaseData) => {
  const referralId = await getUserReferralId(userId);
  if (referralId) {
    await awardConversionPoints(
      referralId, 
      ReferralEventType.FIRST_PURCHASE,
      { purchase_amount: purchaseData.amount }
    );
  }
};
```

### Analytics and Reporting

#### System Analytics
```typescript
const { analytics, refreshAnalytics } = useReferralAnalytics();

useEffect(() => {
  refreshAnalytics();
}, []);

// Display analytics dashboard
return (
  <AnalyticsDashboard
    totalUsers={analytics?.total_users_with_referrals}
    conversionRates={analytics?.conversion_rates_by_event}
    tierDistribution={analytics?.tier_distribution}
    monthlyGrowth={analytics?.monthly_growth}
  />
);
```

#### Leaderboard Display
```typescript
const { leaderboard, refreshLeaderboard } = useReferralAnalytics();

return (
  <LeaderboardView>
    {leaderboard?.map((user, index) => (
      <LeaderboardItem
        key={user.user_id}
        rank={user.rank}
        name={user.user_name}
        points={user.total_points}
        tier={user.current_tier}
        referrals={user.total_referrals}
      />
    ))}
  </LeaderboardView>
);
```

## Performance Considerations

### Database Optimization
- **Indexing Strategy**: Optimized indexes for common queries
- **Bulk Operations**: Efficient multi-user data retrieval
- **Query Optimization**: Minimized database round trips
- **Connection Pooling**: Efficient database connection management

### Caching Strategy
- **Referral Data Caching**: Temporary caching for sorting operations
- **Analytics Caching**: Reduced computation for dashboard data
- **Code Validation Caching**: Faster referral code lookups
- **Tier Calculation Caching**: Optimized tier progression updates

### Scalability Features
- **Horizontal Scaling**: Database partitioning support
- **Async Processing**: Non-blocking referral operations
- **Batch Processing**: Efficient bulk point awards
- **Rate Limiting**: Protection against abuse and spam

## Testing & Validation

### Test Coverage
- **Unit Tests**: Individual service method validation
- **Integration Tests**: Cross-feature interaction testing
- **End-to-End Tests**: Complete referral flow validation
- **Performance Tests**: Load testing for scalability

### Validation Scenarios
- **Referral Code Generation**: Uniqueness and format validation
- **Signup Processing**: Duplicate prevention and validation
- **Point Attribution**: Accurate point calculation and awarding
- **Tier Progression**: Correct tier advancement logic
- **Analytics Accuracy**: Data consistency and calculation validation

## Security & Fraud Prevention

### Abuse Prevention
- **Self-Referral Blocking**: Technical and business logic prevention
- **Duplicate Detection**: Multiple referral attempt prevention
- **Usage Limits**: Configurable referral code restrictions
- **Rate Limiting**: Signup and operation rate limits

### Data Security
- **Encryption**: Sensitive data encryption at rest and in transit
- **Access Control**: Strict RLS policies and permissions
- **Audit Logging**: Complete operation history tracking
- **Privacy Compliance**: GDPR and data protection compliance

## Future Enhancements

### Planned Features
1. **Advanced Rewards**: Multiple reward types and redemption options
2. **Referral Campaigns**: Time-limited promotional campaigns
3. **Social Integration**: Social media sharing and tracking
4. **Gamification**: Badges, achievements, and challenges
5. **Machine Learning**: Fraud detection and optimization

### Integration Opportunities
- **Email Marketing**: Automated referral invitation campaigns
- **Push Notifications**: Referral milestone and reward notifications
- **Customer Support**: Referral dispute resolution tools
- **Business Intelligence**: Advanced analytics and reporting

## Conclusion

The Referral System represents a comprehensive solution for user acquisition and engagement through a sophisticated points-based reward system. The implementation balances functionality, performance, and security while providing extensive integration capabilities with other platform features.

The system is designed for scalability and extensibility, supporting future enhancements and business growth. With comprehensive analytics, fraud prevention, and user-friendly interfaces, the Referral System serves as a powerful tool for marketplace growth and user retention.
