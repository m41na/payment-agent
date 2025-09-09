// Comprehensive icon mapping for the payment-agent app
// Using valid Ionicons names with consistent styling

export const AppIcons = {
  // Navigation & UI
  home: 'home',
  homeOutline: 'home-outline',
  search: 'search',
  searchOutline: 'search-outline',
  person: 'person',
  personOutline: 'person-outline',
  settings: 'settings',
  settingsOutline: 'settings-outline',
  menu: 'menu',
  menuOutline: 'menu-outline',
  close: 'close',
  closeOutline: 'close-outline',
  
  // Shopping & Commerce
  cart: 'bag',
  cartOutline: 'bag-outline',
  storefront: 'storefront',
  storefrontOutline: 'storefront-outline',
  product: 'cube',
  productOutline: 'cube-outline',
  receipt: 'receipt',
  receiptOutline: 'receipt-outline',
  
  // Payment & Financial
  card: 'card',
  cardOutline: 'card-outline',
  wallet: 'wallet',
  walletOutline: 'wallet-outline',
  cash: 'cash',
  cashOutline: 'cash-outline',
  
  // Actions
  add: 'add',
  addCircle: 'add-circle',
  addCircleOutline: 'add-circle-outline',
  remove: 'remove',
  removeCircle: 'remove-circle',
  removeCircleOutline: 'remove-circle-outline',
  trash: 'trash',
  trashOutline: 'trash-outline',
  edit: 'pencil',
  editOutline: 'pencil-outline',
  
  // Status & Feedback
  checkmark: 'checkmark',
  checkmarkCircle: 'checkmark-circle',
  checkmarkCircleOutline: 'checkmark-circle-outline',
  alert: 'alert-circle',
  alertOutline: 'alert-circle-outline',
  warning: 'warning',
  warningOutline: 'warning-outline',
  information: 'information-circle',
  informationOutline: 'information-circle-outline',
  
  // Media & Content
  image: 'image',
  imageOutline: 'image-outline',
  camera: 'camera',
  cameraOutline: 'camera-outline',
  star: 'star',
  starOutline: 'star-outline',
  heart: 'heart',
  heartOutline: 'heart-outline',
  
  // Location & Map
  location: 'location',
  locationOutline: 'location-outline',
  map: 'map',
  mapOutline: 'map-outline',
  navigate: 'navigate',
  navigateOutline: 'navigate-outline',
  
  // Communication
  mail: 'mail',
  mailOutline: 'mail-outline',
  call: 'call',
  callOutline: 'call-outline',
  chatbubble: 'chatbubble',
  chatbubbleOutline: 'chatbubble-outline',
  
  // Time & Calendar
  time: 'time',
  timeOutline: 'time-outline',
  calendar: 'calendar',
  calendarOutline: 'calendar-outline',
  
  // Security & Auth
  lock: 'lock-closed',
  lockOutline: 'lock-closed-outline',
  unlock: 'lock-open',
  unlockOutline: 'lock-open-outline',
  eye: 'eye',
  eyeOutline: 'eye-outline',
  eyeOff: 'eye-off',
  eyeOffOutline: 'eye-off-outline',
  
  // System & Utility
  refresh: 'refresh',
  refreshOutline: 'refresh-outline',
  download: 'download',
  downloadOutline: 'download-outline',
  share: 'share',
  shareOutline: 'share-outline',
  copy: 'copy',
  copyOutline: 'copy-outline',
  
  // Express & Speed
  flash: 'flash',
  flashOutline: 'flash-outline',
  rocket: 'rocket',
  rocketOutline: 'rocket-outline',
  
  // Business & Professional
  business: 'business',
  businessOutline: 'business-outline',
  briefcase: 'briefcase',
  briefcaseOutline: 'briefcase-outline',
  
  // Logout & Account
  logOut: 'log-out',
  logOutOutline: 'log-out-outline',
} as const;

// Icon size constants for consistency
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Icon color palette
export const IconColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  muted: '#94a3b8',
  dark: '#1e293b',
  light: '#f8fafc',
} as const;

// Helper function to get icon with consistent styling
export const getIcon = (
  name: keyof typeof AppIcons,
  size: keyof typeof IconSizes = 'md',
  color: keyof typeof IconColors = 'dark'
) => ({
  name: AppIcons[name],
  size: IconSizes[size],
  color: IconColors[color],
});
