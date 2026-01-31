/**
 * @genfeedai/prompts - Shared prompt templates library
 *
 * This package contains all official prompt templates for GenFeed AI
 * workflows, organized by category and optimized for marketplace seeding.
 */

// Export all types
export type {
  PromptTemplate,
  PromptVariable,
  PromptCategory,
  PromptCatalog,
} from './types.js';

// Export registry and functions
export {
  PROMPT_REGISTRY,
  PROMPT_CATEGORIES,
  getAllPrompts,
  getPrompt,
  getPromptJson,
  getPromptsByCategory,
  searchPromptsByTag,
  getPromptCategories,
} from './registry.js';
