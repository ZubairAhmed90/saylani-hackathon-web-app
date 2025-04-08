"use client"

import * as React from "react"
import type { TooltipProps } from "recharts/types/component/Tooltip"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

export interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Chart({ children, className, ...props }: ChartProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ChartContainer({ children, className, ...props }: ChartContainerProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

export interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  payload?: Array<{
    name: string
    value: string | number
    payload: {
      name: string
      value: string | number
    }
  }>
  label?: string
  active?: boolean
}

export function ChartTooltipContent({ payload, label, active, className, ...props }: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className={`rounded-lg border bg-background p-2 shadow-sm ${className}`} {...props}>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">{label}</span>
          <span className="font-bold text-muted-foreground">{payload[0]?.payload.name}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">Value</span>
          <span className="font-bold">{payload[0]?.value}</span>
        </div>
      </div>
    </div>
  )
}

export function ChartTooltip<TValue extends ValueType, TName extends NameType>({
  active,
  payload,
  label,
  content,
  ...props
}: TooltipProps<TValue, TName>) {
  if (!active || !payload?.length) {
    return null
  }

  if (content) {
    return React.cloneElement(content as React.ReactElement, {
      active,
      payload,
      label,
      ...props,
    })
  }

  return <ChartTooltipContent active={active} payload={payload} label={label} {...props} />
}

export interface ChartTooltipItemProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  value: string | number
  color?: string
}

export function ChartTooltipItem({ name, value, color, className, ...props }: ChartTooltipItemProps) {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      {color && <div className="mr-1 h-1 w-1 rounded-full" style={{ backgroundColor: color }} />}
      <span className="text-xs text-muted-foreground">{name}</span>
      <span className="ml-auto text-xs font-medium">{value}</span>
    </div>
  )
}

export interface ChartLegendProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ChartLegend({ className, ...props }: ChartLegendProps) {
  return <div className={`flex flex-wrap items-center gap-4 ${className}`} {...props} />
}

export interface ChartLegendItemProps extends React.HTMLAttributes<HTMLDivElement> {
  color: string
}

export function ChartLegendItem({ color, className, ...props }: ChartLegendItemProps) {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      <div className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{props.children}</span>
    </div>
  )
}

