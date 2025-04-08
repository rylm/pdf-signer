import axios from 'axios';

/**
 * Type definition for the presigned POST data returned by the API
 */
export interface PresignedPostData {
  url: string;
  fields: Record<string, string>;
}

/**
 * Response from the API containing presigned POST data and the final URL
 */
export interface ApiResponse {
  presignedPostData: PresignedPostData;
  finalUrl: string;
}

/**
 * Type for handling axios error responses
 */
interface AxiosErrorResponse {
  response?: {
    status: number;
    data?: unknown;
  };
  message: string;
}

/**
 * Type for progress events
 */
interface ProgressEvent {
  loaded: number;
  total?: number;
}

/**
 * Fetches presigned POST details and final URL from the API
 * @returns Promise resolving to API response with presigned data and final URL
 */
export async function fetchPresignedUrl(): Promise<ApiResponse> {
  const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT;

  if (!endpoint) {
    throw new Error('API endpoint URL is not configured');
  }

  try {
    const response = await axios.post(
      endpoint,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data as ApiResponse;
  } catch (error: unknown) {
    const axiosError = error as AxiosErrorResponse;
    // Check if it's an axios error by looking for response property
    if (axiosError.response) {
      throw new Error(
        `API request failed: ${axiosError.message} (Status: ${axiosError.response.status})`
      );
    }
    throw new Error(`API request failed: ${axiosError.message}`);
  }
}

/**
 * Uploads a file to S3 using presigned POST data
 * @param presignedData The presigned POST details from the API
 * @param fileBytes The file bytes to upload
 * @param progressCallback Optional callback for tracking upload progress
 * @returns Promise that resolves when upload is complete
 */
export async function uploadToS3(
  presignedData: PresignedPostData,
  fileBytes: Uint8Array,
  progressCallback?: (progress: number) => void
): Promise<void> {
  // Create a form data object
  const formData = new FormData();

  // Add all fields from presigned data
  Object.entries(presignedData.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // Add the file as the last field (must match the field name expected by S3)
  const blob = new Blob([fileBytes], { type: 'application/pdf' });
  formData.append('file', blob);

  try {
    // Create the axios config object separately with type assertion
    const axiosConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: ProgressEvent) => {
        if (progressCallback && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          progressCallback(percentCompleted);
        }
      },
    };

    await axios.post(presignedData.url, formData, axiosConfig);
  } catch (error: unknown) {
    const axiosError = error as AxiosErrorResponse;
    // Check if it's an axios error by looking for response property
    if (axiosError.response) {
      throw new Error(
        `Upload failed: ${axiosError.message} (Status: ${axiosError.response.status})`
      );
    }
    throw new Error(`Upload failed: ${axiosError.message}`);
  }
}
