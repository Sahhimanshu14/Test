import { AIMessage, AIOptions, AIProvider, AIResponse } from './provider.interface';

export class MockAIProvider implements AIProvider {
  readonly providerName = 'mock';

  async generateText(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // If json requested, return mock JSON
    if (options?.responseFormat === 'json') {
      return {
        content: JSON.stringify({
          status: 'success',
          explanation: 'Mock explanation for CDS preparation query.',
          keyConcept: 'CDS Core Fundamentals',
          confidence: 0.98,
        }),
        tokenCost: { promptTokens: 40, completionTokens: 60, totalTokens: 100 },
        model: options?.model || 'mock-cds-model-v1',
      };
    }

    return {
      content: `[CDSPrep AI Assistant]: Here is a structured explanation addressing your query: "${lastUserMessage.slice(0, 80)}...". Keep practicing consistently to master this topic!`,
      tokenCost: { promptTokens: 30, completionTokens: 45, totalTokens: 75 },
      model: options?.model || 'mock-cds-model-v1',
    };
  }

  async *streamText(messages: AIMessage[], _options?: AIOptions): AsyncIterable<string> {
    const chunks = [
      'Understanding ',
      'the fundamental concepts ',
      'of this CDS topic ',
      'is essential for scoring high.\n\n',
      'Step 1: Identify the underlying theorem or grammar rule.\n',
      'Step 2: Eliminate incorrect options methodically.\n',
      'Step 3: Verify the calculated result.',
    ];

    for (const chunk of chunks) {
      yield chunk;
    }
  }
}
