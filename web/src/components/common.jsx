import React from 'react';

export const Loading = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

export const ErrorMessage = ({ message }) => (
  <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
    <div className="flex">
      <div className="ml-3">
        <p className="text-sm text-red-700">
          {message || 'An unexpected error occurred.'}
        </p>
      </div>
    </div>
  </div>
);

export const EmptyState = ({ title, description }) => (
  <div className="text-center py-12">
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);
