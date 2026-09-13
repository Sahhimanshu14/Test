import { z } from 'zod';

export const searchConfigSchema = z.object({
  SEARCH_PROVIDER: z.enum(['postgres', 'opensearch', 'mock']).default('postgres'),
  OPENSEARCH_NODE: z.string().optional(),
  OPENSEARCH_USERNAME: z.string().optional(),
  OPENSEARCH_PASSWORD: z.string().optional(),
  SEARCH_PAGE_SIZE: z.coerce.number().int().positive().default(20),
});

export type SearchConfig = z.infer<typeof searchConfigSchema>;
