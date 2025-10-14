import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const gridVariants = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8',
    },
    responsive: {
      true: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      false: '',
    },
  },
  defaultVariants: {
    cols: 1,
    gap: 4,
    responsive: false,
  },
})

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  smCols?: number
  mdCols?: number
  lgCols?: number
  xlCols?: number
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      cols,
      gap,
      responsive,
      smCols,
      mdCols,
      lgCols,
      xlCols,
      ...props
    },
    ref
  ) => {
    const responsiveClasses = cn(
      smCols && `sm:grid-cols-${smCols}`,
      mdCols && `md:grid-cols-${mdCols}`,
      lgCols && `lg:grid-cols-${lgCols}`,
      xlCols && `xl:grid-cols-${xlCols}`
    )

    return (
      <div
        ref={ref}
        className={cn(
          gridVariants({ cols, gap, responsive }),
          responsiveClasses,
          className
        )}
        {...props}
      />
    )
  }
)

Grid.displayName = 'Grid'

const GridItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    colSpan?: number
    rowSpan?: number
    colStart?: number
    colEnd?: number
    rowStart?: number
    rowEnd?: number
  }
>(
  (
    {
      className,
      colSpan,
      rowSpan,
      colStart,
      colEnd,
      rowStart,
      rowEnd,
      ...props
    },
    ref
  ) => {
    const spanClasses = cn(
      colSpan && `col-span-${colSpan}`,
      rowSpan && `row-span-${rowSpan}`,
      colStart && `col-start-${colStart}`,
      colEnd && `col-end-${colEnd}`,
      rowStart && `row-start-${rowStart}`,
      rowEnd && `row-end-${rowEnd}`
    )

    return (
      <div
        ref={ref}
        className={cn(spanClasses, className)}
        {...props}
      />
    )
  }
)

GridItem.displayName = 'GridItem'

export { Grid, GridItem, gridVariants }