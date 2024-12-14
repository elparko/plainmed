// @ts-expect-error React is needed for JSX
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from './ui/button'
import { Form, FormLabel} from './ui/form'
import { Input } from './ui/input'
import { useState, ChangeEvent, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './ui/card'
import debounce from 'lodash/debounce'
import { NavigationArrows } from "@/components/ui/navigation-arrows"
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { searchMedicalConditions } from '@/lib/api'

interface Disease {
  name: string;
  name_es?: string;
  concept_id: string;
  semantic_type: string;
  sources: string;
  meta_desc?: string;
  full_summary?: string;
  url?: string;
  aliases?: string[];
  mesh_headings?: string[];
  groups?: string[];
  primary_institute?: {
    name: string;
    url: string;
  };
}

interface SupabaseResult {
  topic_id: number;
  title: string;
  title_es?: string;
  language?: string;
  date_created?: string;
  url?: string;
  meta_desc?: string;
  full_summary?: string;
  aliases?: string[];
  mesh_headings?: string[];
  groups?: string[];
  primary_institute?: {
    name: string;
    url: string;
  };
}

const STANDARD_CONDITIONS = {
  'Heart': {
    name_es: 'Corazón',
    conditions: [
      {
        name: "High Blood Pressure",
        name_es: "Presión Arterial Alta",
        concept_id: "HP001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Heart Disease",
        name_es: "Enfermedad Cardíaca",
        concept_id: "HD001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "High Cholesterol",
        name_es: "Colesterol Alto",
        concept_id: "HC001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      }
    ]
  },
  'Metabolic': {
    name_es: 'Metabólico',
    conditions: [
      {
        name: "Diabetes",
        name_es: "Diabetes",
        concept_id: "DB001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Thyroid Problems",
        name_es: "Problemas de Tiroides",
        concept_id: "TH001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Obesity",
        name_es: "Obesidad",
        concept_id: "OB001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      }
    ]
  },
  'Respiratory': {
    name_es: 'Respiratorio',
    conditions: [
      {
        name: "Asthma",
        name_es: "Asma",
        concept_id: "AS001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "COPD",
        name_es: "EPOC",
        concept_id: "CP001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Sleep Apnea",
        name_es: "Apnea del Sueño",
        concept_id: "SA001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      }
    ]
  },
  'Musculoskeletal': {
    name_es: 'Musculoesquelético',
    conditions: [
      {
        name: "Arthritis",
        name_es: "Artritis",
        concept_id: "AR001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Osteoporosis",
        name_es: "Osteoporosis",
        concept_id: "OS001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Back Pain",
        name_es: "Dolor de Espalda",
        concept_id: "BP001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      }
    ]
  },
  'Mental Health': {
    name_es: 'Salud Mental',
    conditions: [
      {
        name: "Depression",
        name_es: "Depresión",
        concept_id: "DP001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "Anxiety",
        name_es: "Ansiedad",
        concept_id: "AX001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      },
      {
        name: "PTSD",
        name_es: "Trastorno de Estrés Postraumático",
        concept_id: "PT001",
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      }
    ]
  }
} as const;

const formSchema = z.object({
  conditions: z.array(
    z.object({
      name: z.string(),
      name_es: z.string().optional(),
      concept_id: z.string(),
      semantic_type: z.string(),
      sources: z.string(),
      url: z.string().optional(),
      meta_desc: z.string().optional(),
      full_summary: z.string().optional(),
      aliases: z.array(z.string()).optional(),
      mesh_headings: z.array(z.string()).optional(),
      groups: z.array(z.string()).optional(),
      primary_institute: z.object({
        name: z.string(),
        url: z.string()
      }).optional(),
      date_created: z.string().optional(),
    })
  ).min(1, {
    message: 'Please select at least one condition'
  }).default([]),
  searchCondition: z.string().optional(),
})

export type MedicalHistoryData = z.infer<typeof formSchema>

interface MedicalHistoryFormProps {
  onNext: (data: MedicalHistoryData) => void | Promise<void>
  onPrevious: () => void
  initialData?: MedicalHistoryData | null
  language?: string
}

export function MedicalHistoryForm({ 
  onNext, 
  onPrevious, 
  initialData, 
  language = 'English' 
}: MedicalHistoryFormProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Disease[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  useEffect(() => {
    console.log('Language changed to:', language);
  }, [language]);

  const searchConditions = useCallback(async (term: string) => {
    if (!term) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const data = await searchMedicalConditions(term, language);
      
      if (data.results && Array.isArray(data.results)) {
        const diseases: Disease[] = data.results.map((result: SupabaseResult) => ({
          name: result.title,
          name_es: result.title_es || result.title,
          concept_id: result.topic_id.toString(),
          semantic_type: "MedlinePlus Topic",
          sources: "MedlinePlus",
          meta_desc: result.meta_desc,
          full_summary: result.full_summary
        }));
        
        console.log('Formatted diseases:', diseases);
        setSuggestions(diseases);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      toast.error(language === 'Spanish' ? 
        'Error al buscar condiciones' : 
        'Error searching conditions');
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      searchConditions(term)
    }, 300),
    [searchConditions]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const form = useForm<MedicalHistoryData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conditions: initialData?.conditions || [],
      searchCondition: '',
    },
  });

  const watchedConditions = form.watch('conditions');

  const addCondition = useCallback((disease: Disease) => {
    const currentConditions = form.getValues('conditions')
    if (!currentConditions.some(c => c.concept_id === disease.concept_id)) {
      const formattedDisease: Disease = {
        name: disease.name,
        name_es: disease.name_es || disease.name,
        concept_id: disease.concept_id,
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus",
        meta_desc: disease.meta_desc,
        full_summary: disease.full_summary
      }
      
      form.setValue('conditions', [...currentConditions, formattedDisease], {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      })
      console.log('Added condition:', disease.name)
    }
    setSearchTerm('')
    setSuggestions([])
  }, [form])

  const removeCondition = useCallback((conceptId: string) => {
    const currentConditions = form.getValues('conditions')
    form.setValue(
      'conditions',
      currentConditions.filter(c => c.concept_id !== conceptId)
    )
    console.log('Removed condition:', conceptId)
  }, [form])

  const handleSubmit = async (values: MedicalHistoryData) => {
    console.log('Form submitted with values:', values);
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!values.conditions || values.conditions.length === 0) {
        throw new Error('Please select at least one condition');
      }

      const newConditions = values.conditions.map((condition: Disease) => ({
        name: condition.name,
        name_es: condition.name_es || condition.name,
        concept_id: condition.concept_id,
        semantic_type: "MedlinePlus Topic",
        sources: "MedlinePlus"
      }));

      console.log('Processed conditions for saving:', newConditions);

      // First check if a record exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from('survey_responses')
        .select('id, response')
        .eq('user_id', user.id)
        .eq('survey_type', 'medical_history')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw fetchError;
      }

      let error;
      let responseData;
      if (existingRecord?.response?.conditions) {
        // Combine existing and new conditions, avoiding duplicates by concept_id
        const existingConditions = existingRecord.response.conditions;
        const existingConceptIds = new Set(existingConditions.map((c: any) => c.concept_id));
        
        const uniqueNewConditions = newConditions.filter(
          (condition) => !existingConceptIds.has(condition.concept_id)
        );
        
        responseData = {
          conditions: [...existingConditions, ...uniqueNewConditions]
        };
      } else {
        responseData = {
          conditions: newConditions
        };
      }

      if (existingRecord) {
        console.log('Updating existing record:', existingRecord.id);
        const { error: updateError } = await supabase
          .from('survey_responses')
          .update({
            response: responseData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        console.log('Creating new record');
        const { error: insertError } = await supabase
          .from('survey_responses')
          .insert([
            {
              user_id: user?.id,
              survey_type: 'medical_history',
              response: responseData
            }
          ]);
        error = insertError;
      }

      if (error) throw error;

      console.log('Save successful, calling onNext');
      await onNext(values);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Failed to save medical history');
    } finally {
      setIsSaving(false);
    }
  };

  const getLocalizedName = (condition: Disease) => {
    return language === 'Spanish' ? (condition.name_es || condition.name) : condition.name
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.length >= 2) {
      debouncedSearch(value)
    } else {
      setSuggestions([])
    }
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-6 mb-8">
              <FormLabel>{language === 'Spanish' ? 'Condiciones Médicas Comunes' : 'Common Medical Conditions'}</FormLabel>
              <div className="space-y-6">
                {Object.entries(STANDARD_CONDITIONS).map(([category, { name_es, conditions }]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {language === 'Spanish' ? name_es : category}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {conditions.map((condition) => {
                        const isSelected = form.getValues('conditions').some(
                          c => c.concept_id === condition.concept_id
                        );
                        return (
                          <Button
                            key={condition.concept_id}
                            type="button"
                            variant="outline"
                            className={cn(
                              "justify-between h-auto min-h-[44px] py-2 px-3 whitespace-normal text-left",
                              isSelected && "bg-accent"
                            )}
                            onClick={() => isSelected ? removeCondition(condition.concept_id) : addCondition(condition)}
                          >
                            <span className="text-sm line-clamp-2">{getLocalizedName(condition)}</span>
                            {isSelected && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ✕
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <FormLabel htmlFor="searchCondition">
                {language === 'Spanish' ? 'Buscar y Agregar Condiciones Médicas' : 'Search and Add Medical Conditions'}
              </FormLabel>
              <Input
                id="searchCondition"
                type="text"
                placeholder={language === 'Spanish' ? 'Escriba para buscar condiciones...' : 'Type to search conditions...'}
                value={searchTerm}
                onChange={handleSearchChange}
              />
              
              {isLoading && <div>{language === 'Spanish' ? 'Cargando...' : 'Loading...'}</div>}
              
              {suggestions.length > 0 && (
                <Card>
                  <CardContent className="p-2">
                    {suggestions.map((disease) => (
                      <button
                        key={disease.concept_id}
                        type="button"
                        className="w-full text-left p-2 hover:bg-accent rounded-md whitespace-normal min-h-[40px]"
                        onClick={() => addCondition(disease)}
                      >
                        <span className="text-sm line-clamp-2">{getLocalizedName(disease)}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {form.getValues('conditions').map((condition) => (
                  <div
                    key={condition.concept_id}
                    className="flex items-start justify-between p-2 bg-accent/50 rounded-md gap-2"
                  >
                    <span className="text-sm leading-tight py-1">{getLocalizedName(condition)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => removeCondition(condition.concept_id)}
                    >
                      {language === 'Spanish' ? 'Eliminar' : 'Remove'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <NavigationArrows 
            onNext={form.handleSubmit(handleSubmit)}
            onPrevious={onPrevious}
            showPrevious={true}
            loading={isSaving}
            nextLabel={language === 'Spanish' ? 
              (isSaving ? 'Guardando...' : 'Guardar y Continuar') : 
              (isSaving ? 'Saving...' : 'Save & Continue')
            }
            disabled={isSaving || watchedConditions.length === 0}
          />
        </form>
      </Form>
    </div>
  )
}

