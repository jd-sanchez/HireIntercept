import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import './DataTable.css'

export enum ColumnAlign {
  Start = 'start',
  End = 'end',
}

export interface Column<Row> {
  id: string
  header: string
  render: (row: Row) => ReactNode
  sortValue?: (row: Row) => number | string
  align?: ColumnAlign
  width?: string
}

interface InitialSort {
  columnId: string
  descending: boolean
}

interface DataTableProps<Row> {
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  onRowActivate?: (row: Row) => void
  initialSort?: InitialSort
  emptyMessage?: string
  minWidth?: string
}

const compareValues = (left: number | string, right: number | string): number =>
  typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))

function activateOnKey(event: KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

export function DataTable<Row>({ columns, rows, getRowKey, onRowActivate, initialSort, emptyMessage = 'Nothing to show.', minWidth }: DataTableProps<Row>) {
  const [sort, setSort] = useState<InitialSort | undefined>(initialSort)

  const sortedRows = useMemo(() => {
    const sortColumn = columns.find((column) => column.id === sort?.columnId)
    if (!sort || !sortColumn?.sortValue) return rows
    const readValue = sortColumn.sortValue
    const direction = sort.descending ? -1 : 1
    return [...rows].sort((left, right) => direction * compareValues(readValue(left), readValue(right)))
  }, [columns, rows, sort])

  const toggleSort = (columnId: string) =>
    setSort((current) => (current?.columnId === columnId ? { columnId, descending: !current.descending } : { columnId, descending: false }))

  const ariaSort = (column: Column<Row>) =>
    sort?.columnId !== column.id ? 'none' : sort.descending ? 'descending' : 'ascending'

  return (
    <div className="ui-table-scroll">
      <table className="ui-table" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} data-align={column.align} style={column.width ? { width: column.width } : undefined} aria-sort={column.sortValue ? ariaSort(column) : undefined}>
                {column.sortValue ? (
                  <button type="button" className="ui-table__sort" onClick={() => toggleSort(column.id)}>
                    {column.header}
                    <span aria-hidden="true" className="ui-table__arrow" data-active={sort?.columnId === column.id} data-descending={sort?.descending}>▲</span>
                  </button>
                ) : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr><td colSpan={columns.length} className="ui-table__empty">{emptyMessage}</td></tr>
          )}
          {sortedRows.map((row) => (
            <tr
              key={getRowKey(row)}
              data-interactive={Boolean(onRowActivate)}
              tabIndex={onRowActivate ? 0 : undefined}
              onClick={onRowActivate ? () => onRowActivate(row) : undefined}
              onKeyDown={onRowActivate ? (event) => activateOnKey(event, () => onRowActivate(row)) : undefined}
            >
              {columns.map((column) => <td key={column.id} data-align={column.align}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
