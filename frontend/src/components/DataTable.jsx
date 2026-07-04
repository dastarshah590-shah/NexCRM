export const DataTable = ({ columns, rows, empty = "No records found", rowKey = "id", onRowClick }) => (
  <div className="overflow-hidden rounded-lg border border-line bg-white">
    <div className="overflow-x-auto scrollbar-thin">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={row[rowKey]}
                className={onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-middle text-ink">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-muted" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
