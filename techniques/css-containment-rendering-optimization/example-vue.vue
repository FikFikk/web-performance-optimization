<!-- Vue 3 Component dengan CSS Containment -->
<!-- File: ProductCard.vue -->

<template>
  <div 
    class="product-card"
    :style="cardStyle"
  >
    <div class="product-image">
      <img 
        :src="product.image" 
        :alt="product.name"
        loading="lazy"
      />
    </div>
    
    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      
      <div class="product-price">
        Rp {{ formatPrice(product.price) }}
      </div>
      
      <div class="product-meta">
        <span class="rating">⭐ {{ product.rating }}</span>
        <span class="stock">📦 {{ product.stock }} left</span>
      </div>
      
      <button 
        class="add-to-cart-btn"
        @click="handleAddToCart"
      >
        Add to Cart
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['add-to-cart']);

const cardStyle = computed(() => ({
  contain: 'content',
  minHeight: '360px'
}));

const formatPrice = (price) => {
  return new Intl.NumberFormat('id-ID').format(price);
};

const handleAddToCart = () => {
  emit('add-to-cart', props.product.id);
};
</script>

<style scoped>
.product-card {
  /* Containment via cardStyle computed property */
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.product-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 6px;
  margin-bottom: 12px;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.product-price {
  font-size: 24px;
  font-weight: bold;
  color: #27ae60;
  margin-bottom: 8px;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.add-to-cart-btn {
  width: 100%;
  padding: 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-to-cart-btn:hover {
  background: #2980b9;
}
</style>

<!-- Usage dalam List Component -->
<!-- File: ProductGrid.vue -->

<template>
  <div class="product-grid">
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
      @add-to-cart="handleAddToCart"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ProductCard from './ProductCard.vue';

const products = ref([]);
let updateInterval = null;

onMounted(async () => {
  // Fetch products
  products.value = await fetchProducts();
  
  // Simulate real-time price updates
  updateInterval = setInterval(() => {
    products.value = products.value.map(p => ({
      ...p,
      price: p.price + (Math.random() - 0.5) * 10000
    }));
  }, 5000);
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

const handleAddToCart = (productId) => {
  console.log('Added to cart:', productId);
};

async function fetchProducts() {
  // Dummy data
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    image: `https://via.placeholder.com/280x200?text=Product+${i + 1}`,
    price: Math.floor(Math.random() * 500000) + 50000,
    rating: (Math.random() * 2 + 3).toFixed(1),
    stock: Math.floor(Math.random() * 100)
  }));
}
</script>

<style scoped>
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
</style>
