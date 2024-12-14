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

export const searchMedicalConditions = async (query: string, language: string = 'English', n_results: number = 5) => {
  try {
    if (!query) {
      return { results: [] };
    }

    const params = new URLSearchParams({
      query: encodeURIComponent(query),
      language: encodeURIComponent(language),
      n_results: n_results.toString()
    });

    const url = `${API_URL}/search?${params}`;
    console.log('Fetching from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));

    if (response.status === 404) {
      return { results: [] };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return { results: [] };
    }

    if (!data || !Array.isArray(data.results)) {
      console.error('Invalid response structure:', data);
      return { results: [] };
    }

    return { results: data.results };
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
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
      console.error('Server response:', errorMessage);
      throw new Error(errorMessage);
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