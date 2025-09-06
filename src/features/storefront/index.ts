// ============================================================================
// STOREFRONT FEATURE - Public API Interface
// ============================================================================

// ============================================================================
// SERVICES
// ============================================================================
export { StorefrontService } from './services/StorefrontService';
export { TransactionHistoryService } from './services/TransactionHistoryService';

// ============================================================================
// HOOKS
// ============================================================================
export { useStorefront } from './hooks/useStorefront';
export type { UseStorefrontReturn } from './hooks/useStorefront';

export { useTransactionHistory } from './hooks/useTransactionHistory';
export type { UseTransactionHistoryReturn } from './hooks/useTransactionHistory';

export { useStorefrontManagement } from './hooks/useStorefrontManagement';
export type { UseStorefrontManagementReturn } from './hooks/useStorefrontManagement';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export type {
  // Business Profile Types
  BusinessProfile,
  BusinessLocation,
  BusinessHours,
  BusinessContactInfo,
  
  // Storefront Types
  StorefrontBranding,
  StorefrontSettings,
  
  // Transaction Types
  TransactionRecord,
  TransactionFilter,
  TransactionAnalytics,
  RevenueSummary,
  TopProduct,
  CustomerSegment,
  
  // Error Types
  StorefrontError
} from './types';

// ============================================================================
// ENUMS
// ============================================================================
export {
  BusinessType,
  StorefrontStatus,
  TransactionStatus,
  TransactionExportFormat,
  StorefrontErrorCode
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================
export { STOREFRONT_CONSTANTS } from './types';

// ============================================================================
// TYPE GUARDS
// ============================================================================
export {
  isBusinessProfile,
  isTransactionRecord,
  isStorefrontError
} from './types';

// ============================================================================
// FEATURE METADATA
// ============================================================================
export const STOREFRONT_FEATURE = {
  name: 'Storefront',
  version: '1.0.0',
  description: 'Business profile management and transaction analytics for marketplace merchants',
  
  // ============================================================================
  // CORE CAPABILITIES
  // ============================================================================
  capabilities: {
    businessProfile: {
      description: 'Complete business profile management with validation and completion tracking',
      features: [
        'Business information (name, type, description)',
        'Location management with coordinates (default for products)',
        'Business hours configuration',
        'Contact information (phone, email, website)',
        'Storefront branding (colors, images)',
        'Operational settings (delivery, pickup, auto-accept)',
        'Profile completion percentage tracking',
        'Validation and error handling'
      ]
    },
    
    transactionHistory: {
      description: 'Comprehensive transaction analytics and management',
      features: [
        'Transaction listing with pagination and filtering',
        'Revenue analytics with period comparisons',
        'Top products analysis',
        'Customer segmentation',
        'Export functionality (CSV, PDF)',
        'Real-time transaction tracking',
        'Growth trend calculations',
        'Performance metrics dashboard'
      ]
    },
    
    unifiedManagement: {
      description: 'Integrated business profile and transaction management',
      features: [
        'Cross-feature operations (publish/unpublish)',
        'Quick actions (location update, delivery toggle)',
        'Business insights dashboard',
        'Revenue growth analysis',
        'Global error handling',
        'Data export capabilities',
        'Performance monitoring',
        'Initialization management'
      ]
    }
  },

  // ============================================================================
  // DEPENDENCIES
  // ============================================================================
  dependencies: {
    internal: [
      'Payment Processing (for transaction data)',
      'User Profile (for merchant identity)'
    ],
    external: [
      'Supabase (data storage and real-time updates)',
      'React/React Native (UI framework)',
      'AsyncStorage (local caching)'
    ]
  },

  // ============================================================================
  // INTEGRATION POINTS
  // ============================================================================
  integrations: {
    paymentProcessing: {
      description: 'Integrates with Payment Processing for transaction data',
      useCases: [
        'Transaction history retrieval',
        'Revenue analytics calculation',
        'Payment method performance tracking',
        'Refund processing integration'
      ]
    },
    
    inventoryManagement: {
      description: 'Integrates with Inventory Management for product data',
      useCases: [
        'Top products analysis',
        'Product performance metrics',
        'Inventory-based business insights',
        'Default business location for products'
      ]
    },
    
    messaging: {
      description: 'Integrates with Messaging for customer communication',
      useCases: [
        'Customer inquiry handling',
        'Order communication',
        'Business hour notifications',
        'Storefront updates to customers'
      ]
    }
  },

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  configuration: {
    caching: {
      profileCacheTTL: '15 minutes',
      transactionCacheTTL: '5 minutes',
      analyticsCacheTTL: '30 minutes'
    },
    
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
      transactionPageSize: 50
    },
    
    validation: {
      minimumCompletionForPublication: 80,
      requiredFields: ['business_name', 'business_type', 'location', 'contact_email'],
      maxDescriptionLength: 500,
      maxBusinessNameLength: 100
    }
  },

  // ============================================================================
  // PERFORMANCE CHARACTERISTICS
  // ============================================================================
  performance: {
    caching: 'Multi-level caching with TTL for optimal performance',
    pagination: 'Efficient pagination for large transaction datasets',
    lazyLoading: 'Lazy loading of analytics data',
    optimization: 'Singleton services with shared cache instances'
  },

  // ============================================================================
  // SECURITY MODEL
  // ============================================================================
  security: {
    dataAccess: 'Row-level security ensuring merchants only access their own data',
    validation: 'Comprehensive input validation and sanitization',
    privacy: 'Business profile visibility controls and privacy settings',
    authentication: 'Integration with platform authentication system',
    authorization: 'Role-based access control for storefront management'
  },

  // ============================================================================
  // TESTING STRATEGY
  // ============================================================================
  testing: {
    unit: 'Service layer methods, validation functions, type guards',
    integration: 'Hook interactions, service integrations, data flow',
    e2e: 'Complete storefront management workflows',
    performance: 'Caching effectiveness, pagination performance',
    accessibility: 'Screen reader compatibility, keyboard navigation'
  },

  // ============================================================================
  // FUTURE ROADMAP
  // ============================================================================
  roadmap: {
    immediate: [
      'Integration with Refunds feature',
      'Advanced analytics dashboard',
      'Real-time storefront updates',
      'Enhanced business insights'
    ],
    
    shortTerm: [
      'Review and rating system integration',
      'Bulk operations for transactions',
      'Automated business insights',
      'Performance optimization'
    ],
    
    longTerm: [
      'AI-powered business recommendations',
      'Predictive analytics',
      'Multi-location business support',
      'Integration with external business tools'
    ]
  },

  // ============================================================================
  // USAGE EXAMPLES
  // ============================================================================
  examples: {
    basicUsage: `
// Basic storefront management
import { useStorefront } from '@features/storefront';

function StorefrontDashboard({ userId }) {
  const {
    profile,
    isLoading,
    completionPercentage,
    updateProfile,
    isProfileComplete
  } = useStorefront(userId);

  const handleUpdateBusiness = async (updates) => {
    await updateProfile(updates);
  };

  return (
    <div>
      <h2>{profile?.business_name}</h2>
      <p>Profile Completion: {completionPercentage}%</p>
      {!isProfileComplete && <p>Complete your profile to publish storefront</p>}
    </div>
  );
}`,

    transactionAnalytics: `
// Transaction analytics usage
import { useTransactionHistory } from '@features/storefront';

function TransactionDashboard({ userId }) {
  const {
    transactions,
    analytics,
    totalRevenue,
    averageOrderValue,
    getTransactionTrends,
    exportTransactions
  } = useTransactionHistory(userId);

  const trends = getTransactionTrends();

  const handleExport = async () => {
    const csvData = await exportTransactions('csv');
    // Handle CSV download
  };

  return (
    <div>
      <h2>Revenue: ${totalRevenue}</h2>
      <p>Average Order: ${averageOrderValue}</p>
      <p>Monthly Growth: {trends.monthlyGrowth}%</p>
      <button onClick={handleExport}>Export Data</button>
    </div>
  );
}`,

    unifiedManagement: `
// Unified storefront management
import { useStorefrontManagement } from '@features/storefront';

function StorefrontManager({ userId }) {
  const {
    storefront,
    transactions,
    dashboardSummary,
    publishStorefront,
    getBusinessInsights,
    isInitialized
  } = useStorefrontManagement(userId);

  const insights = getBusinessInsights();

  const handlePublish = async () => {
    if (storefront.isProfileComplete) {
      await publishStorefront();
    }
  };

  if (!isInitialized) return <div>Loading...</div>;

  return (
    <div>
      <h1>Business Dashboard</h1>
      <div>
        <h2>Summary</h2>
        <p>Profile: {dashboardSummary.profileCompletion}% complete</p>
        <p>Revenue: ${dashboardSummary.totalRevenue}</p>
        <p>Transactions: {dashboardSummary.transactionCount}</p>
      </div>
      
      <div>
        <h2>Business Insights</h2>
        <p>Top Products: {insights.topPerformingProducts.join(', ')}</p>
        <p>Revenue Growth: {insights.revenueGrowth}%</p>
        <p>Customer Retention: {insights.customerRetentionRate}%</p>
      </div>
      
      <button 
        onClick={handlePublish}
        disabled={!storefront.isProfileComplete}
      >
        {dashboardSummary.isPublished ? 'Update' : 'Publish'} Storefront
      </button>
    </div>
  );
}`
  }
} as const;
