import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from './button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NavigationArrowsProps {
  onNext: (e?: React.BaseSyntheticEvent) => void | Promise<void>
  onPrevious: () => void
  showPrevious?: boolean
  loading?: boolean
  nextLabel?: string
  disabled?: boolean
}

export function NavigationArrows({ 
  onNext, 
  onPrevious, 
  showPrevious = true,
  loading = false,
  nextLabel = 'Next'
}: NavigationArrowsProps) {
  return (
    <div className="flex justify-between pt-4">
      {showPrevious ? (
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          disabled={loading}
        >
          Previous
        </Button>
      ) : (
        <div></div>
      )}
      <Button 
        type="submit" 
        onClick={onNext}
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {nextLabel}
          </div>
        ) : (
          nextLabel
        )}
      </Button>
    </div>
  )
} 