type Column<T> = {
    key: string;
    title: string;
    render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
    columns: Column<T>[];
    rows: T[];
    emptyText?: string;
    onRowClick?: (row: T) => void;
};

export function DataTable<T>({ columns, rows, emptyText = "No data", onRowClick }: DataTableProps<T>) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:hidden">
                Swipe horizontally to view full table
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td className="px-4 py-6 text-sm text-slate-500" colSpan={columns.length}>
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`transition odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/45 ${onRowClick ? "cursor-pointer" : ""}`}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-4 py-3 align-top text-slate-700">
                                            {column.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
