import { useTheme } from "@/components/theme-provider"

export function Logo() {
  const { theme } = useTheme()
  
  return (
    <img
      src={theme === "dark" ? "/logo-light.png" : "/logo-dark.png"}
      alt="PlainMed Logo"
      className="h-8 w-auto"
    />
  )
} 