import type {
  ICreatePromptLibraryItem,
  IPromptLibraryItem,
  IQueryPromptLibrary,
} from '@genfeedai/types';
import { apiClient } from './client';

/**
 * Build query string from params
 */
function buildQueryString(query?: IQueryPromptLibrary): string {
  if (!query) return '';

  const params = new URLSearchParams();

  if (query.category) params.append('category', query.category);
  if (query.search) params.append('search', query.search);
  if (query.tag) params.append('tag', query.tag);
  if (query.limit) params.append('limit', String(query.limit));
  if (query.offset) params.append('offset', String(query.offset));
  if (query.sortBy) params.append('sortBy', query.sortBy);
  if (query.sortOrder) params.append('sortOrder', query.sortOrder);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const promptLibraryApi = {
  /**
   * Create a new prompt library item
   */
  create: (data: ICreatePromptLibraryItem, signal?: AbortSignal): Promise<IPromptLibraryItem> =>
    apiClient.post<IPromptLibraryItem>('/prompt-library', data, { signal }),

  /**
   * Get all prompt library items with optional filters
   */
  getAll: (query?: IQueryPromptLibrary, signal?: AbortSignal): Promise<IPromptLibraryItem[]> =>
    apiClient.get<IPromptLibraryItem[]>(`/prompt-library${buildQueryString(query)}`, { signal }),

  /**
   * Get featured prompt library items
   */
  getFeatured: (limit?: number, signal?: AbortSignal): Promise<IPromptLibraryItem[]> =>
    apiClient.get<IPromptLibraryItem[]>(
      `/prompt-library/featured${limit ? `?limit=${limit}` : ''}`,
      { signal }
    ),

  /**
   * Get a single prompt library item by ID
   */
  getById: (id: string, signal?: AbortSignal): Promise<IPromptLibraryItem> =>
    apiClient.get<IPromptLibraryItem>(`/prompt-library/${id}`, { signal }),

  /**
   * Update a prompt library item
   */
  update: (
    id: string,
    data: Partial<ICreatePromptLibraryItem>,
    signal?: AbortSignal
  ): Promise<IPromptLibraryItem> =>
    apiClient.put<IPromptLibraryItem>(`/prompt-library/${id}`, data, { signal }),

  /**
   * Delete a prompt library item (soft delete)
   */
  delete: (id: string, signal?: AbortSignal): Promise<void> =>
    apiClient.delete<void>(`/prompt-library/${id}`, { signal }),

  /**
   * Track usage of a prompt (increments useCount)
   */
  use: (id: string, signal?: AbortSignal): Promise<IPromptLibraryItem> =>
    apiClient.post<IPromptLibraryItem>(`/prompt-library/${id}/use`, undefined, { signal }),

  /**
   * Duplicate a prompt library item
   */
  duplicate: (id: string, signal?: AbortSignal): Promise<IPromptLibraryItem> =>
    apiClient.post<IPromptLibraryItem>(`/prompt-library/${id}/duplicate`, undefined, { signal }),
};
