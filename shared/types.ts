// shared/types.ts - Common TypeScript interfaces for TGO Yemek API

// Address types
export interface Address {
  id: number;
  name: string;
  surname: string;
  phone: string;
  countryPhoneCode: string;
  addressLine: string;
  addressName: string;
  postalCode: string;
  cityId: number;
  cityName: string;
  districtId: number;
  districtName: string;
  neighborhoodId: number;
  neighborhoodName: string;
  latitude: string;
  longitude: string;
  addressDescription: string;
  apartmentNumber: string;
  floor: string;
  doorNumber: string;
  addressType: string;
  elevatorAvailable: boolean;
}

export interface AddressesResponse {
  infoMessage: string | null;
  id: string;
  addresses: Address[];
}

// Restaurant types
export interface Restaurant {
  id: number;
  name: string;
  kitchen: string;
  rating: number;
  ratingText: string;
  minBasketPrice: number;
  averageDeliveryInterval: string;
  distance: number;
  neighborhoodName: string;
  isClosed: boolean;
  campaignText?: string;
}

export interface RestaurantsResponse {
  restaurants: Restaurant[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
}

// Menu types
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  likePercentage?: string;
}

export interface MenuCategory {
  name: string;
  slug: string;
  items: MenuItem[];
}

export interface RestaurantInfo {
  id: number;
  name: string;
  status: string;
  rating: number;
  ratingText: string;
  workingHours: string;
  deliveryTime: string;
  minOrderPrice: number;
}

export interface RestaurantMenuResponse {
  info: RestaurantInfo;
  categories: MenuCategory[];
  totalItems: number;
}

// Product types
export interface RecommendedItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string;
}

export interface RecommendationCollection {
  name: string;
  items: RecommendedItem[];
}

export interface ProductRecommendationsResponse {
  collections: RecommendationCollection[];
  totalItems: number;
}

export interface ProductOption {
  id: number;
  name: string;
  price: number;
  selected: boolean;
  isPopular?: boolean;
}

export interface ProductComponent {
  type: "INGREDIENTS" | "MODIFIER_GROUP";
  title: string;
  description?: string;
  modifierGroupId?: number;
  options: ProductOption[];
  isSingleChoice: boolean;
  minSelections: number;
  maxSelections: number;
}

export interface ProductDetailsResponse {
  restaurantId: number;
  restaurantName: string;
  productId: number;
  productName: string;
  description: string;
  imageUrl: string;
  price: number;
  maxQuantity: number;
  components: ProductComponent[];
}

// Basket types
export interface IngredientExclusion {
  id: number;
}

export interface ModifierProduct {
  productId: number;
  modifierGroupId: number;
  modifierProducts: ModifierProduct[];
  ingredientOptions: {
    excludes: IngredientExclusion[];
    includes: [];
  };
}

export interface BasketItem {
  productId: number;
  quantity: number;
  modifierProducts: ModifierProduct[];
  ingredientOptions: {
    excludes: IngredientExclusion[];
    includes: [];
  };
}

export interface AddToBasketRequest {
  storeId: number;
  items: BasketItem[];
  isFlashSale: boolean;
  storePickup: boolean;
  latitude: number;
  longitude: number;
}

export interface CartProduct {
  productId: number;
  itemId: string;
  name: string;
  quantity: number;
  salePrice: number;
  description: string;
}

export interface CartStore {
  id: number;
  name: string;
  imageUrl: string;
  rating: number;
  averageDeliveryInterval: string;
  minAmount: number;
}

export interface CartSummaryLine {
  title: string;
  amount: number;
  isPromotion?: boolean;
}

export interface AddToBasketResponse {
  store: CartStore;
  products: CartProduct[];
  summary: CartSummaryLine[];
  totalProductCount: number;
  totalProductPrice: number;
  totalProductPriceDiscounted: number;
  totalPrice: number;
  deliveryPrice: number;
}

export interface SetShippingAddressRequest {
  shippingAddressId: number;
  invoiceAddressId: number;
}

export interface CartProductDetails extends CartProduct {
  marketPrice: number;
  modifierProducts: Array<{
    productId: number;
    modifierGroupId: number;
    name: string;
    price: number;
  }>;
  ingredientExcludes: Array<{
    id: number;
    name: string;
  }>;
}

export interface CartStoreGroup {
  store: CartStore;
  products: CartProductDetails[];
}

export interface GetBasketResponse {
  storeGroups: CartStoreGroup[];
  summary: CartSummaryLine[];
  totalProductCount: number;
  totalProductPrice: number;
  totalProductPriceDiscounted: number;
  totalPrice: number;
  deliveryPrice: number;
  isEmpty: boolean;
}

// Search types
export interface SearchProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export interface SearchRestaurant extends Restaurant {
  products: SearchProduct[];
  warning?: string;
}

export interface SearchRestaurantsResponse {
  restaurants: SearchRestaurant[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  searchQuery: string;
}

// Location types
export interface City {
  id: number;
  code: string;
  name: string;
}

export interface District {
  id: number;
  name: string;
}

export interface Neighborhood {
  id: number;
  name: string;
}

export interface CitiesResponse {
  cities: City[];
  count: number;
}

export interface DistrictsResponse {
  districts: District[];
  count: number;
  cityId: number;
}

export interface NeighborhoodsResponse {
  neighborhoods: Neighborhood[];
  count: number;
  districtId: number;
}

// Address creation types
export interface AddAddressRequest {
  name: string;
  surname: string;
  phone: string;
  apartmentNumber?: string;
  floor?: string;
  doorNumber?: string;
  addressName: string;
  addressDescription?: string;
  addressLine: string;
  cityId: number;
  districtId: number;
  neighborhoodId: number;
  latitude: string;
  longitude: string;
  countryCode?: string;
  elevatorAvailable?: boolean;
}

export interface AddAddressResponse {
  success: boolean;
  address?: Address;
  requiresOtp?: boolean;
  message: string;
}

// Payment types
export interface SavedCard {
  cardId: number;
  name: string;
  maskedCardNumber: string;
  cardTypeName: string;
  bankName: string;
  isDebitCard: boolean;
  cvvRequired: boolean;
  cardNetwork: string;
}

export interface SavedCardsResponse {
  cards: SavedCard[];
  hasCards: boolean;
  message?: string;
}

export interface CheckoutReadyResponse {
  ready: boolean;
  store: CartStore;
  products: CartProductDetails[];
  summary: CartSummaryLine[];
  totalPrice: number;
  deliveryPrice: number;
  warnings: string[];
}

export interface PlaceOrderResponse {
  success: boolean;
  orderId?: string;
  requires3DSecure?: boolean;
  redirectUrl?: string;
  htmlContent?: string;
  message: string;
}

export interface CustomerNoteRequest {
  customerNote: string;
  noServiceWare: boolean;
  contactlessDelivery: boolean;
  dontRingBell: boolean;
}

// Order types
export interface OrderStatus {
  status: string;
  statusText: string;
  statusColor: string;
}

export interface OrderStore {
  id: number;
  name: string;
}

export interface OrderPrice {
  totalPrice: number;
  totalPriceText: string;
  refundedPrice: number;
  cancelledPrice: number;
  totalDeliveryPrice: number;
  totalServicePrice: number;
}

export interface OrderProductSummary {
  productId: number;
  name: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderDate: string;
  store: OrderStore;
  status: OrderStatus;
  price: OrderPrice;
  productSummary: string;
  products: OrderProductSummary[];
  isReady: boolean;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    hasNext: boolean;
  };
}

export interface OrderDetailProduct {
  name: string;
  imageUrl: string;
  salePrice: number;
  salePriceText: string;
  quantity: number;
  description: string;
}

export interface OrderStatusStep {
  status: string;
  statusText: string;
}

export interface OrderShipmentItem {
  status: OrderStatus;
  statusSteps: OrderStatusStep[];
  products: OrderDetailProduct[];
}

export interface OrderDetail {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerNote: string;
  store: OrderStore;
  eta: string;
  deliveredDate: string;
  status: OrderStatus;
  statusSteps: OrderStatusStep[];
  products: OrderDetailProduct[];
  price: OrderPrice;
  paymentDescription: string;
  deliveryAddress: {
    name: string;
    address: string;
    districtCity: string;
    phoneNumber: string;
  };
}
