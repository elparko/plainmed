declare module '@/components/ui/button' {
  export const Button: React.FC<{
    variant?: string
    type?: string
    onClick?: () => void
    children: React.ReactNode
  }>
}

declare module '@/components/ui/form' {
  export const Form: React.FC<any>
  export const FormControl: React.FC<any>
  export const FormField: React.FC<any>
  export const FormItem: React.FC<any>
  export const FormLabel: React.FC<any>
  export const FormMessage: React.FC<any>
}

declare module '@/components/ui/checkbox' {
  export const Checkbox: React.FC<{
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }>
}

declare module '@/components/ui/card' {
  export const Card: React.FC<{
    className?: string
    children: React.ReactNode
  }>
  export const CardHeader: React.FC<{
    className?: string
    children: React.ReactNode
  }>
  export const CardTitle: React.FC<{
    className?: string
    children: React.ReactNode
  }>
  export const CardDescription: React.FC<{
    className?: string
    children: React.ReactNode
  }>
  export const CardContent: React.FC<{
    className?: string
    children: React.ReactNode
  }>
  export const CardFooter: React.FC<{
    className?: string
    children: React.ReactNode
  }>
}

declare module '@/components/ui/input' {
  export const Input: React.FC<{
    type?: string
    placeholder?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    value?: string | number
  }>
}

declare module '@/components/ui/select' {
  export const Select: React.FC<{
    onValueChange?: (value: string) => void
    defaultValue?: string
    children: React.ReactNode
  }>
  export const SelectTrigger: React.FC<{
    children: React.ReactNode
  }>
  export const SelectValue: React.FC<{
    placeholder?: string
  }>
  export const SelectContent: React.FC<{
    children: React.ReactNode
  }>
  export const SelectItem: React.FC<{
    value: string
    children: React.ReactNode
  }>
} 