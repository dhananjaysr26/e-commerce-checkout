import React from 'react';
import ProductsPage from './pages/ProductsPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">E-Commerce Store</h1>
        </div>
      </header>
      <main>
        <ProductsPage />
      </main>
    </div>
  );
}

export default App;
