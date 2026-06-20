// DataTable.js - Another heavy component
import React from 'react';

export default function DataTable() {
  const data = [
    { id: 1, name: 'Product A', sales: 1234, revenue: '$12,340' },
    { id: 2, name: 'Product B', sales: 856, revenue: '$8,560' },
    { id: 3, name: 'Product C', sales: 2341, revenue: '$23,410' },
    { id: 4, name: 'Product D', sales: 567, revenue: '$5,670' },
    { id: 5, name: 'Product E', sales: 1890, revenue: '$18,900' },
  ];

  return (
    <div className="data-table">
      <h3>Sales Data (Heavy Component)</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Sales</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.sales}</td>
              <td>{row.revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="table-note">
        💡 This table component is code-split and loaded on-demand
      </p>
    </div>
  );
}
