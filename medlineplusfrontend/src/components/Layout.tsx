import { ThemeToggle } from "./ui/theme-toggle"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="fixed top-[0.875rem] right-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
} 