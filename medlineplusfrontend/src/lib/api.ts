const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://plainmed.vercel.app/api'
  : 'http://localhost:3000/api';

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
    const response = await fetch(`${API_URL}/personal-info/${userId}`, {
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
        console.error('Unexpected response:', errorMessage);
        throw new Error('Server returned invalid response format');
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const result: PersonalInfoResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting personal info:', error);
    throw new Error('Failed to fetch personal info');
  }
}

export async function createPersonalInfo(data: { user_id: string } & PersonalInfo): Promise<PersonalInfo> {
  try {
    const response = await fetch(`${API_URL}/personal-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating personal info:', error);
    throw error;
  }
} 