import {
  Product,
  ProductSortingScore,
  SortingCriteria,
  SmartRankingConfig,
  ProductError,
} from '../types';
import { ReferralService } from '../../referral-system/services/ReferralService';

/**
 * Advanced Sorting Service for Product Discovery
 * Implements multi-criteria ranking algorithm with proximity, pricing, and referral boost
 */
export class SortingService {
  private static readonly DEFAULT_CRITERIA: SortingCriteria = {
    proximity_weight: 0.5,    // 50% weight for proximity
    price_weight: 0.3,        // 30% weight for pricing
    referral_weight: 0.2,     // 20% weight for referral boost
    max_distance_km: 50,      // Maximum distance for proximity scoring
    price_normalization_range: {
      min: 0,
      max: 10000,             // $100 default max for normalization
    },
  };

  /**
   * Apply smart ranking to products using multi-criteria algorithm
   */
  async applySmartRanking(
    products: Product[],
    config: SmartRankingConfig
  ): Promise<Product[]> {
    try {
      if (products.length === 0) {
        return products;
      }

      // Calculate scores for each product
      const scoredProducts = await this.calculateProductScores(products, config);
      
      // Sort by composite score (highest first)
      const sortedScores = scoredProducts.sort((a, b) => b.composite_score - a.composite_score);
      
      // Reorder products based on scores
      const sortedProducts = sortedScores.map(score => 
        products.find(p => p.id === score.product_id)!
      );

      // Add debug information if requested
      if (config.debug_scoring) {
        this.logScoringDebugInfo(sortedScores);
      }

      return sortedProducts;
    } catch (error) {
      console.error('Error in smart ranking:', error);
      throw this.createError('SEARCH_ERROR', 'Failed to apply smart ranking', { error });
    }
  }

  /**
   * Calculate scoring for all products based on multiple criteria
   */
  private async calculateProductScores(
    products: Product[],
    config: SmartRankingConfig
  ): Promise<ProductSortingScore[]> {
    const { criteria, user_location, enable_referral_boost } = config;
    
    // Get referral data if needed
    const referralData = enable_referral_boost 
      ? await this.getReferralDataForProducts(products)
      : new Map();

    // Calculate price range for normalization
    const priceRange = this.calculatePriceRange(products, criteria);
    
    return products.map(product => {
      const proximityScore = this.calculateProximityScore(product, user_location, criteria);
      const priceScore = this.calculatePriceScore(product, priceRange, criteria);
      const referralScore = enable_referral_boost 
        ? this.calculateReferralScore(product, referralData, criteria)
        : 0;

      const compositeScore = (
        proximityScore * criteria.proximity_weight +
        priceScore * criteria.price_weight +
        referralScore * criteria.referral_weight
      );

      return {
        product_id: product.id,
        proximity_score: proximityScore,
        price_score: priceScore,
        referral_score: referralScore,
        composite_score: compositeScore,
        distance_km: product.distance,
        referral_points: referralData.get(product.seller_id) || 0,
      };
    });
  }

  /**
   * Calculate proximity score (0-1, higher is better)
   * Products closer to user get higher scores
   */
  private calculateProximityScore(
    product: Product,
    userLocation: { latitude: number; longitude: number } | undefined,
    criteria: SortingCriteria
  ): number {
    if (!userLocation || !product.distance) {
      return 0.5; // Neutral score when location unavailable
    }

    const maxDistance = criteria.max_distance_km || 50;
    const distance = Math.min(product.distance, maxDistance);
    
    // Inverse distance scoring: closer = higher score
    return Math.max(0, (maxDistance - distance) / maxDistance);
  }

  /**
   * Calculate price score (0-1, lower prices get higher scores)
   * Implements diminishing returns for very low prices
   */
  private calculatePriceScore(
    product: Product,
    priceRange: { min: number; max: number },
    criteria: SortingCriteria
  ): number {
    if (priceRange.max === priceRange.min) {
      return 0.5; // All products same price
    }

    // Normalize price to 0-1 range
    const normalizedPrice = (product.price - priceRange.min) / (priceRange.max - priceRange.min);
    
    // Inverse scoring: lower price = higher score
    const baseScore = 1 - normalizedPrice;
    
    // Apply diminishing returns to prevent extreme bias toward very cheap items
    return Math.pow(baseScore, 0.7);
  }

  /**
   * Calculate referral score (0-1, higher referral points = higher score)
   * Users with more successful referrals get ranking boost
   */
  private calculateReferralScore(
    product: Product,
    referralData: Map<string, number>,
    criteria: SortingCriteria
  ): number {
    const referralPoints = referralData.get(product.seller_id) || 0;
    
    if (referralPoints === 0) {
      return 0.1; // Small base score for users with no referrals
    }

    // Find max referral points for normalization
    const maxReferralPoints = Math.max(...Array.from(referralData.values()));
    
    if (maxReferralPoints === 0) {
      return 0.1;
    }

    // Normalize and apply logarithmic scaling to prevent extreme bias
    const normalizedPoints = referralPoints / maxReferralPoints;
    return 0.1 + (0.9 * Math.log(1 + normalizedPoints * 9) / Math.log(10));
  }

  /**
   * Calculate price range for normalization
   */
  private calculatePriceRange(
    products: Product[],
    criteria: SortingCriteria
  ): { min: number; max: number } {
    if (products.length === 0) {
      return criteria.price_normalization_range || { min: 0, max: 1000 };
    }

    const prices = products.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    // Use actual range or fallback to configured range
    return {
      min: Math.min(min, criteria.price_normalization_range?.min || 0),
      max: Math.max(max, criteria.price_normalization_range?.max || 1000),
    };
  }

  /**
   * Get referral data for product sellers
   * This would integrate with the referral system when implemented
   */
  private async getReferralDataForProducts(products: Product[]): Promise<Map<string, number>> {
    const userIds = products.map(product => product.seller_id);
    const referralData = await this.getReferralData(userIds);
    return new Map(Object.entries(referralData));
  }

  private async getReferralData(userIds: string[]): Promise<Record<string, any>> {
    try {
      const referralService = new ReferralService();
      const result = await referralService.getReferralDataForUsers(userIds);
      
      if (result.success && result.data) {
        return result.data as Record<string, any>;
      }
      
      // Return empty data if referral service fails
      return {};
    } catch (error) {
      console.warn('Failed to fetch referral data for sorting:', error);
      return {};
    }
  }

  /**
   * Create default smart ranking configuration
   */
  static createDefaultConfig(userLocation?: { latitude: number; longitude: number }): SmartRankingConfig {
    return {
      criteria: { ...SortingService.DEFAULT_CRITERIA },
      user_location: userLocation,
      enable_referral_boost: true,
      debug_scoring: false,
    };
  }

  /**
   * Create custom smart ranking configuration
   */
  static createCustomConfig(
    proximityWeight: number,
    priceWeight: number,
    referralWeight: number,
    userLocation?: { latitude: number; longitude: number }
  ): SmartRankingConfig {
    // Normalize weights to sum to 1
    const totalWeight = proximityWeight + priceWeight + referralWeight;
    
    return {
      criteria: {
        proximity_weight: proximityWeight / totalWeight,
        price_weight: priceWeight / totalWeight,
        referral_weight: referralWeight / totalWeight,
        max_distance_km: 50,
        price_normalization_range: { min: 0, max: 10000 },
      },
      user_location: userLocation,
      enable_referral_boost: referralWeight > 0,
      debug_scoring: false,
    };
  }

  /**
   * Log debug information about scoring
   */
  private logScoringDebugInfo(scores: ProductSortingScore[]): void {
    console.log('🎯 Smart Ranking Debug Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    scores.slice(0, 10).forEach((score, index) => {
      console.log(`${index + 1}. Product ${score.product_id.slice(0, 8)}...`);
      console.log(`   📍 Proximity: ${score.proximity_score.toFixed(3)} (${score.distance_km?.toFixed(1)}km)`);
      console.log(`   💰 Price: ${score.price_score.toFixed(3)}`);
      console.log(`   🎁 Referral: ${score.referral_score.toFixed(3)} (${score.referral_points} points)`);
      console.log(`   🏆 Composite: ${score.composite_score.toFixed(3)}`);
      console.log('   ─────────────────────────────────────────────');
    });
  }

  /**
   * Validate smart ranking configuration
   */
  static validateConfig(config: SmartRankingConfig): boolean {
    const { criteria } = config;
    const totalWeight = criteria.proximity_weight + criteria.price_weight + criteria.referral_weight;
    
    return Math.abs(totalWeight - 1.0) < 0.001; // Allow small floating point errors
  }

  /**
   * Create error object
   */
  private createError(code: string, message: string, details?: any): ProductError {
    return {
      code: code as any,
      message,
      details,
    };
  }
}
