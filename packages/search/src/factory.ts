import { SearchProvider } from './provider.interface';
import { MockSearchProvider } from './mock-provider';
import { OpenSearchProvider, OpenSearchConfig } from './opensearch-provider';

export interface SearchFactoryConfig {
  provider?: 'postgres' | 'opensearch' | 'mock' | string;
  opensearchConfig?: OpenSearchConfig;
}

export function getSearchEngineProvider(config?: SearchFactoryConfig): SearchProvider {
  const providerType = (config?.provider || 'postgres').toLowerCase();

  switch (providerType) {
    case 'opensearch': {
      if (!config?.opensearchConfig?.endpoint) {
        throw new Error('OpenSearch provider requires a valid endpoint URL');
      }
      return new OpenSearchProvider(config.opensearchConfig);
    }

    case 'postgres':
    case 'mock':
    default:
      return new MockSearchProvider();
  }
}
