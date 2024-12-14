import { useNavigate, useLocation } from 'react-router-dom'
import { MedicalHistoryForm } from '@/components/MedicalHistoryForm'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'

export function Survey() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language } = useLanguage()
  
  const handleMedicalHistoryComplete = async (data: any) => {
    console.log('handleMedicalHistoryComplete called with data:', data);
    try {
      if (!data.conditions || data.conditions.length === 0) {
        console.error('No conditions in data');
        toast.error(language === 'Spanish' ? 
          'Por favor seleccione al menos una condición' : 
          'Please select at least one condition'
        );
        return;
      }

      console.log('Conditions to save:', data.conditions);

      // Add a small delay to ensure the data is saved
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Navigating to medical history view');
      navigate('/medical-history', { replace: true });
      
      toast.success(language === 'Spanish' ? 
        'Historia médica guardada exitosamente' : 
        'Medical history saved successfully'
      );
    } catch (error) {
      console.error('Error in handleMedicalHistoryComplete:', error);
      toast.error(language === 'Spanish' ? 
        'Error al guardar la historia médica' : 
        'Failed to save medical history'
      );
    }
  };

  const handlePrevious = () => {
    console.log('Navigating back to dashboard')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative h-16 border-b flex items-center px-4">
        <button
          onClick={handlePrevious}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold ml-4">
          {language === 'Spanish' ? 'Historia Médica' : 'Medical History'}
        </h1>
      </header>

      <main className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h2>
              {language === 'Spanish' 
                ? 'Seleccione sus Condiciones Médicas' 
                : 'Select Your Medical Conditions'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'Spanish'
                ? 'Por favor, seleccione todas las condiciones médicas que apliquen a su caso.'
                : 'Please select all medical conditions that apply to you.'}
            </p>
          </div>

          <MedicalHistoryForm 
            onNext={handleMedicalHistoryComplete}
            onPrevious={handlePrevious}
            language={language}
            initialData={location.state?.initialData}
          />
        </div>
      </main>
    </div>
  )
}