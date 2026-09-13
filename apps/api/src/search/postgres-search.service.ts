import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchEngine } from './search-engine.interface';
import {
  SearchQueryDto,
  SearchResponseDto,
  SearchEntityType,
  SearchMatchSnippet,
} from './dto/search.dto';
import { QuestionStatus } from '@cdsprep/types';

@Injectable()
export class PostgresSearchService implements SearchEngine {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const rawQ = query.q ? query.q.trim() : '';
    const entityType = query.entityType || SearchEntityType.ALL;
    const limit = Number(query.limit) || 20;

    const results: SearchMatchSnippet[] = [];

    // Helper for snippet extraction
    const createSnippet = (text: string, maxLen = 140): string => {
      if (!text) return '';
      if (!rawQ) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '');
      const idx = text.toLowerCase().indexOf(rawQ.toLowerCase());
      if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '');
      const start = Math.max(0, idx - 30);
      const end = Math.min(text.length, idx + rawQ.length + 80);
      return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    };

    // 1. QUESTIONS
    let questionsMatches: SearchMatchSnippet[] = [];
    let questionsCount = 0;
    if (entityType === SearchEntityType.ALL || entityType === SearchEntityType.QUESTIONS) {
      const qWhere: Record<string, unknown> = {
        deletedAt: null,
        status: QuestionStatus.PUBLISHED,
      };

      if (rawQ) {
        qWhere.OR = [
          { questionText: { contains: rawQ, mode: 'insensitive' } },
          { source: { contains: rawQ, mode: 'insensitive' } },
          { explanation: { explanation: { contains: rawQ, mode: 'insensitive' } } },
        ];
      }

      if (query.subject) {
        qWhere.subject = {
          OR: [
            { slug: { contains: query.subject, mode: 'insensitive' } },
            { name: { contains: query.subject, mode: 'insensitive' } },
          ],
        };
      }

      if (query.topic) {
        qWhere.topic = {
          OR: [
            { slug: { contains: query.topic, mode: 'insensitive' } },
            { name: { contains: query.topic, mode: 'insensitive' } },
          ],
        };
      }

      if (query.difficulty) {
        qWhere.difficulty = query.difficulty;
      }

      if (query.year) {
        qWhere.year = Number(query.year);
      }

      const [qTotal, qItems] = await Promise.all([
        this.prisma.client.question.count({ where: qWhere }),
        this.prisma.client.question.findMany({
          where: qWhere,
          take: limit,
          include: {
            subject: { select: { name: true } },
            chapter: { select: { name: true } },
            topic: { select: { name: true } },
            explanation: { select: { explanation: true } },
          },
        }),
      ]);

      questionsCount = qTotal;
      questionsMatches = qItems.map(q => ({
        id: q.id,
        type: SearchEntityType.QUESTIONS,
        title: q.questionText.slice(0, 80) + '...',
        snippet: createSnippet(q.questionText),
        url: `/practice?questionId=${q.id}`,
        meta: {
          subject: q.subject?.name,
          chapter: q.chapter?.name,
          topic: q.topic?.name,
          difficulty: q.difficulty,
          year: q.year || undefined,
        },
      }));
    }

    // 2. TOPICS
    let topicsMatches: SearchMatchSnippet[] = [];
    let topicsCount = 0;
    if (entityType === SearchEntityType.ALL || entityType === SearchEntityType.TOPICS) {
      const tWhere: Record<string, unknown> = {};
      if (rawQ) {
        tWhere.OR = [
          { name: { contains: rawQ, mode: 'insensitive' } },
          { slug: { contains: rawQ, mode: 'insensitive' } },
        ];
      }
      if (query.subject) {
        tWhere.chapter = { subject: { slug: { contains: query.subject, mode: 'insensitive' } } };
      }

      const [tTotal, tItems] = await Promise.all([
        this.prisma.client.topic.count({ where: tWhere }),
        this.prisma.client.topic.findMany({
          where: tWhere,
          take: 10,
          include: {
            chapter: {
              include: { subject: { select: { name: true, slug: true } } },
            },
            _count: { select: { questions: true } },
          },
        }),
      ]);

      topicsCount = tTotal;
      topicsMatches = tItems.map(t => ({
        id: t.id,
        type: SearchEntityType.TOPICS,
        title: t.name,
        snippet: `Topic in ${t.chapter?.name} (${t.chapter?.subject?.name}). Contains ${t._count.questions} questions.`,
        url: `/practice?topicId=${t.id}`,
        meta: {
          subject: t.chapter?.subject?.name,
          chapter: t.chapter?.name,
          topic: t.name,
        },
      }));
    }

    // 3. CHAPTERS
    let chaptersMatches: SearchMatchSnippet[] = [];
    let chaptersCount = 0;
    if (entityType === SearchEntityType.ALL || entityType === SearchEntityType.CHAPTERS) {
      const cWhere: Record<string, unknown> = {};
      if (rawQ) {
        cWhere.OR = [
          { name: { contains: rawQ, mode: 'insensitive' } },
          { slug: { contains: rawQ, mode: 'insensitive' } },
        ];
      }

      const [cTotal, cItems] = await Promise.all([
        this.prisma.client.chapter.count({ where: cWhere }),
        this.prisma.client.chapter.findMany({
          where: cWhere,
          take: 10,
          include: {
            subject: { select: { name: true } },
            _count: { select: { topics: true, questions: true } },
          },
        }),
      ]);

      chaptersCount = cTotal;
      chaptersMatches = cItems.map(c => ({
        id: c.id,
        type: SearchEntityType.CHAPTERS,
        title: c.name,
        snippet: `Chapter in ${c.subject?.name}. ${c._count.topics} Topics, ${c._count.questions} Questions.`,
        url: `/practice?chapterId=${c.id}`,
        meta: {
          subject: c.subject?.name,
          chapter: c.name,
        },
      }));
    }

    // 4. PYQ PAPERS
    let pyqMatches: SearchMatchSnippet[] = [];
    let pyqCount = 0;
    if (entityType === SearchEntityType.ALL || entityType === SearchEntityType.PYQ) {
      const pWhere: Record<string, unknown> = { isPublished: true };
      if (rawQ) {
        pWhere.OR = [
          { title: { contains: rawQ, mode: 'insensitive' } },
          { source: { contains: rawQ, mode: 'insensitive' } },
          { exam: { contains: rawQ, mode: 'insensitive' } },
        ];
      }
      if (query.year) {
        pWhere.year = Number(query.year);
      }
      if (query.subject) {
        pWhere.subjectSlug = { contains: query.subject, mode: 'insensitive' };
      }

      const [pTotal, pItems] = await Promise.all([
        this.prisma.client.pYQPaper.count({ where: pWhere }),
        this.prisma.client.pYQPaper.findMany({
          where: pWhere,
          take: 10,
          include: {
            _count: { select: { questions: true } },
          },
        }),
      ]);

      pyqCount = pTotal;
      pyqMatches = pItems.map(p => ({
        id: p.id,
        type: SearchEntityType.PYQ,
        title: p.title,
        snippet: `UPSC ${p.exam} ${p.year} (${p.session}) official paper. ${p._count.questions} questions, ${p.totalMarks} marks.`,
        url: `/pyq/${p.id}`,
        meta: {
          subject: p.subjectSlug,
          year: p.year,
        },
      }));
    }

    // 5. MOCK TESTS
    let testsMatches: SearchMatchSnippet[] = [];
    let testsCount = 0;
    if (entityType === SearchEntityType.ALL || entityType === SearchEntityType.TESTS) {
      const testWhere: Record<string, unknown> = { isPublished: true };
      if (rawQ) {
        testWhere.OR = [
          { title: { contains: rawQ, mode: 'insensitive' } },
          { description: { contains: rawQ, mode: 'insensitive' } },
          { instructions: { contains: rawQ, mode: 'insensitive' } },
        ];
      }

      const [testTotal, testItems] = await Promise.all([
        this.prisma.client.test.count({ where: testWhere }),
        this.prisma.client.test.findMany({
          where: testWhere,
          take: 10,
          include: {
            _count: { select: { sections: true, attempts: true } },
          },
        }),
      ]);

      testsCount = testTotal;
      testsMatches = testItems.map(t => ({
        id: t.id,
        type: SearchEntityType.TESTS,
        title: t.title,
        snippet: t.description || `CDS mock test. ${t.durationMinutes} min, ${t.totalMarks} marks. Target: ${t.targetAcademy}.`,
        url: `/test/${t.id}/instructions`,
        meta: {
          difficulty: t.difficulty || undefined,
        },
      }));
    }

    // Aggregate results depending on entityType filter
    if (entityType === SearchEntityType.ALL) {
      results.push(
        ...testsMatches.slice(0, 3),
        ...pyqMatches.slice(0, 3),
        ...topicsMatches.slice(0, 4),
        ...chaptersMatches.slice(0, 2),
        ...questionsMatches.slice(0, limit),
      );
    } else if (entityType === SearchEntityType.QUESTIONS) {
      results.push(...questionsMatches);
    } else if (entityType === SearchEntityType.TOPICS) {
      results.push(...topicsMatches);
    } else if (entityType === SearchEntityType.CHAPTERS) {
      results.push(...chaptersMatches);
    } else if (entityType === SearchEntityType.PYQ) {
      results.push(...pyqMatches);
    } else if (entityType === SearchEntityType.TESTS) {
      results.push(...testsMatches);
    }

    const totalMatches =
      questionsCount + topicsCount + chaptersCount + pyqCount + testsCount;

    return {
      query: rawQ,
      totalMatches,
      facets: {
        questionsCount,
        topicsCount,
        chaptersCount,
        pyqCount,
        testsCount,
      },
      results,
    };
  }
}
