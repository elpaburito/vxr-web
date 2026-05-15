export default function Table({ columns, rows, onRowClick, className = '' }) {
  return (
    <div className={`bg-vxr-surface rounded-vxr border border-vxr-border overflow-hidden ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-vxr-surface2 border-b border-vxr-border">
            {columns.map(col => (
              <th key={col.key} className="text-left px-5 py-3 font-body text-[11px] font-bold uppercase tracking-wider text-vxr-text-sub" style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-vxr-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-vxr-surface2/50' : ''}`}
            >
              {columns.map(col => (
                <td key={col.key} className="px-5 py-4 font-body text-sm text-vxr-text">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
