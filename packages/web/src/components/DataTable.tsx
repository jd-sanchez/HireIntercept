import { Fragment, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
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
  maxHeight?: string
  dense?: boolean
  groupBy?: (row: Row) => string
}

const compareValues = (left: number | string, right: number | string): number =>
  typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))

function activateOnKey(event: KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

export function DataTable<Row>({ columns, rows, getRowKey, onRowActivate, initialSort, emptyMessage = 'Nothing to show.', minWidth, maxHeight, dense = false, groupBy }: DataTableProps<Row>) {
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
    <div className="ui-table-scroll" style={maxHeight ? { maxHeight } : undefined}>
      <table className="ui-table" data-dense={dense} style={minWidth ? { minWidth } : undefined}>
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
            {onRowActivate && <th className="ui-table__chevron-head" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr><td colSpan={columns.length + 1} className="ui-table__empty">{emptyMessage}</td></tr>
          )}
          {sortedRows.map((row, position) => {
            const group = groupBy?.(row)
            const startsGroup = group !== undefined && (position === 0 || groupBy?.(sortedRows[position - 1] as Row) !== group)
            return (
              <Fragment key={getRowKey(row)}>
                {startsGroup && (
                  <tr className="ui-table__group"><td colSpan={columns.length + (onRowActivate ? 1 : 0)}>{group}</td></tr>
                )}
                <tr
                  data-interactive={Boolean(onRowActivate)}
                  tabIndex={onRowActivate ? 0 : undefined}
                  onClick={onRowActivate ? () => onRowActivate(row) : undefined}
                  onKeyDown={onRowActivate ? (event) => activateOnKey(event, () => onRowActivate(row)) : undefined}
                >
                  {columns.map((column) => <td key={column.id} data-align={column.align}>{column.render(row)}</td>)}
                  {onRowActivate && <td className="ui-table__chevron" aria-hidden="true">›</td>}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
