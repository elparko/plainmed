const API_URL = process.env.VITE_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? 'https://plainmed.vercel.app/api'
    : 'http://localhost:3000/api'
);

// Add a helper function for API calls
async function fetchWithErrorHandling(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch {
        // If parsing fails, use the default error message
      }
      throw new Error(errorMessage);
    }

    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

interface PersonalInfo {
  ageRange?: string;
  gender?: string;
  language?: string;
}

interface PersonalInfoResponse {
  hasCompletedForm: boolean;
  data: PersonalInfo | null;
}

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

interface MedlinePlusResult {
  topic_id: number;
  title: string;
  title_es?: string;
  language?: string;
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

interface SearchResponse {
  results: MedlinePlusResult[];
  source?: string;
}

export const searchMedicalConditions = async (
  query: string, 
  language: string = 'English', 
  n_results: number = 5
): Promise<{ results: Disease[] }> => {
  try {
    if (!query) {
      return { results: [] };
    }

    const params = new URLSearchParams({
      query,
      language,
      n_results: n_results.toString()
    });

    const url = `${API_URL}/search?${params}`;
    console.log('Fetching from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = '';
      
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      } else {
        errorMessage = await response.text();
      }
      
      console.error('Server error:', errorMessage);
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data: SearchResponse = await response.json();
    
    if (!data || !Array.isArray(data.results)) {
      console.error('Invalid response structure:', data);
      return { results: [] };
    }

    const formattedResults: Disease[] = data.results.map(result => ({
      name: result.title,
      name_es: result.title_es,
      concept_id: result.topic_id.toString(),
      semantic_type: 'MedlinePlus Topic',
      sources: 'MedlinePlus',
      meta_desc: result.meta_desc,
      full_summary: result.full_summary,
      url: result.url,
      aliases: result.aliases,
      mesh_headings: result.mesh_headings,
      groups: result.groups,
      primary_institute: result.primary_institute
    }));

    console.log('Formatted results:', formattedResults);
    return { results: formattedResults };
  } catch (error) {
    console.error('Error searching conditions:', error);
    return { results: [] };
  }
};

export const initializeUser = async (userId: string, email: string) => {
  try {
    const response = await fetch(`${API_URL}/initialize-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, email }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to initialize user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error initializing user:', error);
    throw error;
  }
};

export async function getPersonalInfo(userId: string): Promise<PersonalInfo | null> {
  try {
    console.log('Fetching personal info for user:', userId);
    const result: PersonalInfoResponse = await fetchWithErrorHandling(
      `${API_URL}/personal-info/${userId}`
    );
    console.log('Personal info response:', result);
    return result.data;
  } catch (error: unknown) {
    console.error('Error getting personal info:', error);
    throw new Error('Failed to fetch personal info');
  }
}

export async function createPersonalInfo(data: { user_id: string } & PersonalInfo): Promise<PersonalInfo> {
  try {
    return await fetchWithErrorHandling(`${API_URL}/personal-info`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Error creating personal info:', error);
    throw error;
  }
} 