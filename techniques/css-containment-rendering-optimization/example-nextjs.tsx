// Next.js App Router dengan CSS Containment
// File: app/products/page.tsx

import { Suspense } from 'react';
import ProductGrid from '@/components/ProductGrid';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';

export default function ProductsPage() {
  return (
    <main className="container">
      <h1>Product Catalog</h1>
      
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}

// File: components/ProductCard.tsx
'use client';

import { CSSProperties } from 'react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  rating: number;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (id: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // CSS Containment styles
  const cardStyle: CSSProperties = {
    contain: 'content',
    minHeight: '360px',
  };
  
  return (
    <article 
      className="product-card"
      style={cardStyle}
    >
      <div className="product-image">
        <Image
          src={product.image}
          alt={product.name}
          width={280}
          height={200}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        <div className="product-price">
          Rp {product.price.toLocaleString('id-ID')}
        </div>
        
        <div className="product-meta">
          <span className="rating">⭐ {product.rating}</span>
          <span className="stock">📦 {product.stock} left</span>
        </div>
        
        <button 
          className="add-to-cart-btn"
          onClick={() => onAddToCart(product.id)}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}

// File: components/ProductGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  rating: number;
  stock: number;
}

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    // Fetch products
    fetchProducts().then(setProducts);
    
    // Simulate real-time price updates
    const interval = setInterval(() => {
      setProducts(prev => prev.map(p => ({
        ...p,
        price: Math.max(50000, p.price + (Math.random() - 0.5) * 10000)
      })));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleAddToCart = (productId: number) => {
    console.log('Added to cart:', productId);
    // Add to cart logic
  };
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard 
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
}

async function fetchProducts(): Promise<Product[]> {
  // Dummy data - replace dengan real API call
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    image: `https://via.placeholder.com/280x200?text=Product+${i + 1}`,
    price: Math.floor(Math.random() * 500000) + 50000,
    rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
    stock: Math.floor(Math.random() * 100)
  }));
}

// File: app/globals.css

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
}

.product-card {
  /* Containment via inline style */
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
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 6px;
  margin-bottom: 12px;
}

.product-image img {
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

/* Skeleton Loading dengan Containment */
.product-card-skeleton {
  contain: strict;
  width: 100%;
  height: 360px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
