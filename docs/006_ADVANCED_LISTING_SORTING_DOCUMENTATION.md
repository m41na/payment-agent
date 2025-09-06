# Advanced Listing Sorting Algorithm Documentation

## Overview

The Advanced Listing Sorting Algorithm is a sophisticated multi-criteria ranking system that enhances product discovery by intelligently combining proximity, pricing, and referral-based reputation factors. This algorithm provides users with highly relevant product listings that balance location convenience, competitive pricing, and seller trustworthiness.

## Architecture

### Core Concept
The algorithm implements a **composite scoring system** that evaluates products across multiple dimensions:
- **Proximity Score (50%)**: Distance-based relevance using geolocation
- **Price Score (30%)**: Inverse pricing with diminishing returns
- **Referral Boost (20%)**: Seller reputation based on referral points

### Key Components

#### 1. SortingService Class
- **Purpose**: Centralized sorting logic with configurable weights
- **Location**: `src/features/product-discovery/services/SortingService.ts`
- **Responsibilities**:
  - Multi-criteria score calculation
  - Configurable weight management
  - Integration with location and referral services
  - Debug logging and performance monitoring

#### 2. Smart Ranking Configuration
```typescript
interface SmartRankingConfig {
  proximityWeight: number;    // Default: 0.5 (50%)
  priceWeight: number;        // Default: 0.3 (30%)
  referralWeight: number;     // Default: 0.2 (20%)
  userLocation: Location | null;
  maxProximityRange: number;  // Default: 50km
  enableDebugLogging: boolean;
}
```

#### 3. Product Sorting Score
```typescript
interface ProductSortingScore {
  productId: string;
  proximityScore: number;     // 0-1 normalized
  priceScore: number;         // 0-1 normalized
  referralScore: number;      // 0-1 normalized
  compositeScore: number;     // Weighted final score
  debugInfo?: SortingDebugInfo;
}
```

## Algorithm Implementation

### Proximity Scoring
```typescript
private calculateProximityScore(distance: number, maxRange: number): number {
  if (distance <= 0) return 1.0;
  if (distance >= maxRange) return 0.0;
  
  // Inverse distance with exponential decay
  return Math.exp(-distance / (maxRange * 0.3));
}
```

**Key Features**:
- **Exponential Decay**: Closer products receive disproportionately higher scores
- **Configurable Range**: Maximum effective distance (default: 50km)
- **Zero Distance Handling**: Perfect score for co-located items
- **Fallback Support**: Graceful handling when location unavailable

### Price Scoring
```typescript
private calculatePriceScore(price: number, minPrice: number, maxPrice: number): number {
  if (maxPrice <= minPrice) return 1.0;
  
  const normalizedPrice = (price - minPrice) / (maxPrice - minPrice);
  // Inverse pricing with diminishing returns
  return Math.pow(1 - normalizedPrice, 0.7);
}
```

**Key Features**:
- **Inverse Relationship**: Lower prices receive higher scores
- **Diminishing Returns**: Prevents extreme price bias
- **Range Normalization**: Scores relative to price distribution
- **Power Function**: Balanced scoring curve (0.7 exponent)

### Referral Boost Scoring
```typescript
private calculateReferralScore(referralPoints: number): number {
  if (referralPoints <= 0) return 0.0;
  
  // Logarithmic scaling to prevent extreme bias
  const maxPoints = 10000; // Diamond tier threshold
  return Math.log(referralPoints + 1) / Math.log(maxPoints + 1);
}
```

**Key Features**:
- **Logarithmic Scaling**: Prevents referral point dominance
- **Tier-Based**: Aligned with referral system tiers
- **Gradual Increase**: Smooth progression across point ranges
- **Zero Handling**: New sellers start with neutral score

### Composite Score Calculation
```typescript
private calculateCompositeScore(
  proximityScore: number,
  priceScore: number, 
  referralScore: number,
  config: SmartRankingConfig
): number {
  return (
    proximityScore * config.proximityWeight +
    priceScore * config.priceWeight +
    referralScore * config.referralWeight
  );
}
```

## Integration Points

### Product Discovery Service
```typescript
// Enhanced ProductDiscoveryService with smart ranking
class ProductDiscoveryService {
  async searchProducts(query: SearchQuery): Promise<Product[]> {
    // 1. Execute base search query
    const products = await this.executeSearch(query);
    
    // 2. Apply smart ranking if requested
    if (query.sortBy === ProductSortBy.SMART_RANKING) {
      return await this.applySmartRanking(products, query.location);
    }
    
    return products;
  }
}
```

### Location Services Integration
- **GeoproximityService**: Distance calculations using Haversine formula
- **LocationContext**: User location access and permissions
- **Fallback Handling**: Graceful degradation when location unavailable

### Referral System Integration
- **ReferralService**: Bulk user referral data retrieval
- **Database Function**: Optimized `get_referral_data_for_users()`
- **Real-time Updates**: Fresh referral points for accurate scoring

## Configuration Options

### Default Configuration
```typescript
const defaultConfig = SortingService.createDefaultConfig(userLocation);
// proximityWeight: 0.5, priceWeight: 0.3, referralWeight: 0.2
```

### Custom Weight Distribution
```typescript
const customConfig = SortingService.createCustomConfig(
  0.6,  // 60% proximity
  0.3,  // 30% price  
  0.1,  // 10% referral
  userLocation
);
```

### Debug Mode
```typescript
const debugConfig = {
  ...defaultConfig,
  enableDebugLogging: true
};

// Provides detailed scoring breakdown
const results = await sortingService.sortProducts(products, debugConfig);
```

## Performance Optimizations

### Efficient Data Retrieval
- **Bulk Operations**: Single query for all referral data
- **Database Functions**: Optimized PostgreSQL functions
- **Caching Strategy**: Location and referral data caching

### Scoring Optimizations
- **Vectorized Calculations**: Batch processing where possible
- **Early Termination**: Skip expensive calculations for zero weights
- **Memory Efficiency**: Minimal object allocation during sorting

### Scalability Considerations
- **Pagination Support**: Works with paginated product results
- **Large Dataset Handling**: Efficient for thousands of products
- **Async Processing**: Non-blocking sorting operations

## Usage Examples

### Basic Smart Ranking
```typescript
const { searchProducts } = useProductDiscovery();

const results = await searchProducts({
  query: 'electronics',
  sortBy: ProductSortBy.SMART_RANKING,
  location: userLocation
});
```

### Custom Configuration
```typescript
const sortingService = new SortingService();
const customConfig = SortingService.createCustomConfig(0.7, 0.2, 0.1, userLocation);

const sortedProducts = await sortingService.sortProducts(products, customConfig);
```

### Debug Analysis
```typescript
const debugConfig = { ...config, enableDebugLogging: true };
const results = await sortingService.sortProducts(products, debugConfig);

// Analyze scoring breakdown
results.forEach(product => {
  console.log(`${product.name}: ${product.debugInfo?.compositeScore}`);
});
```

## Algorithm Tuning

### Weight Optimization
- **A/B Testing**: Compare different weight distributions
- **User Behavior Analysis**: Optimize based on click-through rates
- **Conversion Tracking**: Measure purchase completion rates

### Parameter Tuning
- **Proximity Range**: Adjust maximum effective distance
- **Price Curve**: Modify diminishing returns exponent
- **Referral Scaling**: Tune logarithmic scaling parameters

### Performance Monitoring
- **Scoring Time**: Track algorithm execution time
- **Memory Usage**: Monitor memory consumption
- **Cache Hit Rates**: Optimize data retrieval efficiency

## Error Handling

### Graceful Degradation
- **Missing Location**: Falls back to price + referral scoring
- **No Referral Data**: Uses proximity + price scoring
- **Service Failures**: Maintains basic functionality

### Error Scenarios
```typescript
interface SortingError {
  code: 'LOCATION_UNAVAILABLE' | 'REFERRAL_SERVICE_ERROR' | 'INVALID_CONFIG';
  message: string;
  fallbackApplied: boolean;
}
```

## Testing & Validation

### Algorithm Testing
- **Unit Tests**: Individual scoring function validation
- **Integration Tests**: End-to-end sorting pipeline
- **Performance Tests**: Large dataset handling
- **Edge Case Tests**: Boundary condition handling

### Validation Metrics
- **Score Distribution**: Ensure balanced scoring across criteria
- **Ranking Stability**: Consistent results for similar inputs
- **User Satisfaction**: Measure relevance improvements
- **Conversion Rates**: Track business impact

## Future Enhancements

### Planned Improvements
1. **Machine Learning Integration**: AI-powered weight optimization
2. **Personalization**: User-specific preference learning
3. **Temporal Factors**: Time-based relevance adjustments
4. **Category-Specific Weights**: Different weights per product category
5. **Social Signals**: Integration with user reviews and ratings

### Advanced Features
- **Seasonal Adjustments**: Holiday and event-based modifications
- **Inventory Awareness**: Stock level influence on rankings
- **Seller Performance**: Historical performance metrics
- **User Interaction History**: Personal preference learning

## Conclusion

The Advanced Listing Sorting Algorithm represents a sophisticated approach to product discovery that balances multiple user priorities. By combining proximity convenience, price competitiveness, and seller reputation through referral points, the algorithm delivers highly relevant and personalized product rankings.

The implementation is designed for flexibility, performance, and maintainability, with comprehensive configuration options and robust error handling. The algorithm serves as a foundation for enhanced user experience and can be continuously optimized based on user behavior and business metrics.
