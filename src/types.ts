export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  discount?: number;
  description: string;
}

export type Category = 'All' | 'Fruits' | 'Vegetables' | 'Dairy' | 'Bakery' | 'Meat' | 'Beverages';

export const CATEGORIES: Category[] = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Meat', 'Beverages'];

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Red Apples',
    category: 'Fruits',
    price: 4.99,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=600&auto=format&fit=crop',
    discount: 10,
    description: 'Crisp and sweet red apples picked from selected orchards.'
  },
  {
    id: '2',
    name: 'Fresh Spinach',
    category: 'Vegetables',
    price: 2.50,
    unit: 'bunch',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=600&auto=format&fit=crop',
    description: 'Vital and fresh spinach leaves, high in iron and vitamins.'
  },
  {
    id: '3',
    name: 'Fresh Eggs',
    category: 'Dairy',
    price: 5.99,
    unit: 'dozen',
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=600&auto=format&fit=crop',
    description: 'Fresh free-range eggs delivered daily.'
  },
  {
    id: '4',
    name: 'Whole Milk',
    category: 'Dairy',
    price: 3.20,
    unit: 'bottle',
    image: 'https://images.unsplash.com/photo-1563636619-e910fa29199a?q=80&w=600&auto=format&fit=crop',
    description: 'Pure and creamy whole milk from local sources.'
  },
  {
    id: '5',
    name: 'Multigrain Bread',
    category: 'Bakery',
    price: 3.50,
    unit: 'loaf',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop',
    discount: 15,
    description: 'Freshly baked healthy multigrain bread.'
  },
  {
    id: '6',
    name: 'Premium Salmon Fillet',
    category: 'Meat',
    price: 18.99,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=600&auto=format&fit=crop',
    description: 'Wild-caught premium salmon fillet, rich in omega-3.'
  },
  {
    id: '7',
    name: 'Orange Juice',
    category: 'Beverages',
    price: 4.50,
    unit: 'bottle',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=600&auto=format&fit=crop',
    description: '100% freshly squeezed orange juice, no added sugar.'
  },
  {
    id: '8',
    name: 'Broccoli Heads',
    category: 'Vegetables',
    price: 2.99,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1452948491233-ad8a1ed01085?q=80&w=600&auto=format&fit=crop',
    discount: 5,
    description: 'Fresh broccoli heads, perfect for steaming.'
  },
  {
    id: '9',
    name: 'Avocado',
    category: 'Fruits',
    price: 1.99,
    unit: 'piece',
    image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=600&auto=format&fit=crop',
    description: 'Ripe and creamy Hass avocados.'
  },
  {
    id: '10',
    name: 'Chicken Breast',
    category: 'Meat',
    price: 12.50,
    unit: 'kg',
    image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=600&auto=format&fit=crop',
    description: 'Lean chicken breast, antibiotic-free.'
  }
];
