// React Component dengan CSS Containment
// File: ProductCard.jsx

import React from 'react';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div 
      className="product-card"
      style={{
        contain: 'content',
        minHeight: '360px'
      }}
    >
      <div className="product-image">
        <img 
          src={product.image} 
          alt={product.name}
          loading="lazy"
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
    </div>
  );
}

// CSS: ProductCard.css
/*
.product-card {
  // Containment sudah di-apply via inline style
  // Bisa juga di-apply di CSS:
  contain: content;
  min-height: 360px;
  
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
*/

// Usage dalam List Component
// File: ProductGrid.jsx

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid() {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    // Fetch products
    fetchProducts().then(setProducts);
    
    // Simulate real-time price updates
    const interval = setInterval(() => {
      setProducts(prev => prev.map(p => ({
        ...p,
        price: p.price + (Math.random() - 0.5) * 10
      })));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleAddToCart = (productId) => {
    console.log('Added to cart:', productId);
  };
  
  return (
    <div 
      className="product-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}
    >
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
