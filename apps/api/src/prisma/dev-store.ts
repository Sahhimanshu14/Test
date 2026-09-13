import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

// Precomputed argon2id hash for default password "Cdsprep@2026"
const DEFAULT_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$YJqRevURo9xE+l/lGdzpGg$Rm4a9/qJ5SWfejvxg5rJm/TupXxUeA8eKmtMdF7ccd8';

export class DevStore {
  public users: any[] = [];
  public roles: any[] = [];
  public rolePermissions: any[] = [];
  public permissions: any[] = [];
  public userRoles: any[] = [];
  public subjects: any[] = [];
  public chapters: any[] = [];
  public topics: any[] = [];
  public subtopics: any[] = [];
  public questions: any[] = [];
  public pyqPapers: any[] = [];
  public tests: any[] = [];
  public practiceSessions: any[] = [];
  public practiceAnswers: any[] = [];
  public attempts: any[] = [];
  public bookmarks: any[] = [];
  public mistakes: any[] = [];
  public auditLogs: any[] = [];
  public notifications: any[] = [];

  constructor() {
    this.seedDefaults();
    this.loadContentFiles();
  }

  private seedDefaults() {
    // 1. Roles
    const roleNames = [
      'STUDENT',
      'ADMIN',
      'MODERATOR',
      'CONTENT_EDITOR',
      'SUPER_ADMIN',
    ];
    for (const name of roleNames) {
      const id = `role_${name.toLowerCase()}`;
      this.roles.push({
        id,
        name,
        description: `Platform role: ${name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          { permission: { action: 'question:create' } },
          { permission: { action: 'question:publish' } },
          { permission: { action: 'test:create' } },
          { permission: { action: 'user:read' } },
        ],
      });
    }

    // 2. Pre-seeded Users
    const studentUser = {
      id: 'usr_student_demo_1',
      email: 'student@cdsprep.com',
      passwordHash: DEFAULT_PASSWORD_HASH,
      fullName: 'Cadet Vikram Singh',
      targetAcademy: 'IMA',
      isEmailVerified: true,
      currentStreak: 5,
      highestStreak: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      roles: [
        {
          id: 'ur_student_1',
          roleId: 'role_student',
          role: this.roles.find((r) => r.name === 'STUDENT'),
        },
      ],
    };

    const adminUser = {
      id: 'usr_admin_demo_1',
      email: 'admin@cdsprep.com',
      passwordHash: DEFAULT_PASSWORD_HASH,
      fullName: 'CDS Administrator',
      targetAcademy: 'IMA',
      isEmailVerified: true,
      currentStreak: 10,
      highestStreak: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      roles: [
        {
          id: 'ur_admin_1',
          roleId: 'role_admin',
          role: this.roles.find((r) => r.name === 'ADMIN'),
        },
      ],
    };

    this.users.push(studentUser, adminUser);
  }

  private loadContentFiles() {
    try {
      const candidates = [
        path.resolve(__dirname, '../../../../packages/database/content'),
        path.resolve(__dirname, '../../packages/database/content'),
        path.resolve(process.cwd(), 'packages/database/content'),
        path.resolve(process.cwd(), '../../packages/database/content'),
      ];

      let contentDir = '';
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          contentDir = c;
          break;
        }
      }

      if (!contentDir) {
        this.generateFallbackContent();
        return;
      }

      // Load taxonomy
      const taxonomyPath = path.join(contentDir, 'taxonomy.json');
      if (fs.existsSync(taxonomyPath)) {
        const raw = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));
        let subIndex = 1;
        for (const sub of raw) {
          const subId = `sub_${sub.slug}`;
          const formattedSub = {
            id: subId,
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            icon: sub.icon,
            orderIndex: sub.orderIndex || subIndex++,
            chapters: [] as any[],
            _count: { chapters: 0, questions: 0 },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (Array.isArray(sub.chapters)) {
            let chIndex = 1;
            for (const ch of sub.chapters) {
              const chId = `ch_${ch.slug}`;
              const formattedCh = {
                id: chId,
                subjectId: subId,
                name: ch.name,
                slug: ch.slug,
                orderIndex: ch.orderIndex || chIndex++,
                topics: [] as any[],
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              if (Array.isArray(ch.topics)) {
                let topIndex = 1;
                for (const top of ch.topics) {
                  const topId = `top_${top.slug}`;
                  const formattedTop = {
                    id: topId,
                    chapterId: chId,
                    name: top.name,
                    slug: top.slug,
                    orderIndex: top.orderIndex || topIndex++,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  if (Array.isArray(top.subtopics)) {
                    let stIndex = 1;
                    for (const st of top.subtopics) {
                      const stId = `st_${st.slug}`;
                      const formattedSt = {
                        id: stId,
                        topicId: topId,
                        name: st.name,
                        slug: st.slug,
                        orderIndex: st.orderIndex || stIndex++,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      };
                      this.subtopics.push(formattedSt);
                    }
                  }

                  this.topics.push(formattedTop);
                  formattedCh.topics.push(formattedTop);
                }
              }

              this.chapters.push(formattedCh);
              formattedSub.chapters.push(formattedCh);
            }
          }

          formattedSub._count.chapters = formattedSub.chapters.length;
          this.subjects.push(formattedSub);
        }
      }

      // Load curated questions
      const questionsPath = path.join(contentDir, 'curated-questions.json');
      if (fs.existsSync(questionsPath)) {
        const rawQ = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
        let qIdx = 1;
        for (const q of rawQ) {
          const qId = `q_curated_${qIdx++}`;
          const matchedSubject = this.subjects.find((s) => s.slug === q.subjectSlug) || this.subjects[0];
          const matchedChapter = this.chapters.find((c) => c.slug === q.chapterSlug) || this.chapters[0];
          const matchedTopic = this.topics.find((t) => t.slug === q.topicSlug) || this.topics[0];
          const matchedSubtopic = this.subtopics.find((st) => st.slug === q.subtopicSlug) || null;
          const formattedQ = {
            id: qId,
            questionText: q.questionText,
            questionType: q.questionType || 'MCQ_SINGLE',
            difficulty: q.difficulty || 'MEDIUM',
            status: 'PUBLISHED',
            deletedAt: null,
            marks: q.marks || 1.0,
            negativeMarks: q.negativeMarks || 0.33,
            options: (q.options || []).map((opt: any, oIdx: number) => ({
              id: `${qId}_opt_${oIdx}`,
              questionId: qId,
              orderIndex: oIdx + 1,
              ...opt,
            })),
            explanation: typeof q.explanation === 'object' ? q.explanation?.explanation : q.explanation,
            keyConcept: typeof q.explanation === 'object' ? q.explanation?.keyConcept : 'CDS Concept',
            subject: matchedSubject,
            chapter: matchedChapter,
            topic: matchedTopic,
            subtopic: matchedSubtopic,
            subjectId: matchedSubject?.id,
            chapterId: matchedChapter?.id,
            topicId: matchedTopic?.id,
            subtopicId: matchedSubtopic?.id || null,
            tagMaps: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.questions.push(formattedQ);
        }
      }

      // Load PYQ Papers
      const pyqPath = path.join(contentDir, 'pyqs.json');
      if (fs.existsSync(pyqPath)) {
        const rawPyq = JSON.parse(fs.readFileSync(pyqPath, 'utf-8'));
        let pIdx = 1;
        for (const item of rawPyq) {
          const paperId = `pyq_paper_${pIdx++}`;
          const paper = {
            id: paperId,
            ...item.paper,
            subject: this.subjects.find((s) => s.slug === item.paper.subjectSlug) || this.subjects[0],
            subjectId: this.subjects.find((s) => s.slug === item.paper.subjectSlug)?.id || this.subjects[0]?.id,
            totalQuestions: item.questions?.length || 0,
            _count: { questions: item.questions?.length || 0 },
            questions: [] as any[],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (Array.isArray(item.questions)) {
            let pqIdx = 1;
            for (const q of item.questions) {
              const qId = `q_pyq_${paperId}_${pqIdx++}`;
              const formattedQ = {
                id: qId,
                pyqPaperId: paperId,
                questionNumber: q.questionNumber,
                questionText: q.questionText,
                questionType: q.questionType || 'MCQ_SINGLE',
                difficulty: q.difficulty || 'MEDIUM',
                status: 'PUBLISHED',
                deletedAt: null,
                marks: q.marks || 0.83,
                negativeMarks: q.negativeMarks || 0.28,
                options: (q.options || []).map((opt: any, oIdx: number) => ({
                  id: `${qId}_opt_${oIdx}`,
                  questionId: qId,
                  orderIndex: oIdx + 1,
                  ...opt,
                })),
                explanation: q.explanation,
                keyConcept: q.keyConcept || 'PYQ Official',
                subject: paper.subject,
                subjectId: paper.subject?.id,
                tagMaps: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              this.questions.push(formattedQ);
              paper.questions.push(formattedQ);
            }
          }

          this.pyqPapers.push(paper);
        }
      }

      // Generate CDS Mock Tests
      this.generateMockTests();
    } catch {
      this.generateFallbackContent();
    }
  }

  private generateMockTests() {
    const mockConfigs = [
      {
        id: 'test_cds_full_1',
        title: 'UPSC CDS (I) 2026 — Comprehensive Full Mock Test #1',
        slug: 'upsc-cds-full-mock-1',
        description: 'Comprehensive 3-stage full length mock examination covering English, General Knowledge, and Elementary Mathematics according to UPSC guidelines.',
        isFullMock: true,
        durationMinutes: 120,
        totalMarks: 300,
        passingMarks: 100,
        subjectSlug: 'english',
      },
      {
        id: 'test_cds_maths_1',
        title: 'CDS Elementary Mathematics Drill Mock',
        slug: 'cds-elementary-maths-drill-1',
        description: 'Focused sectional drill evaluating Arithmetic, Algebra, Trigonometry, and Mensuration with step-by-step KaTeX solutions.',
        isFullMock: false,
        durationMinutes: 120,
        totalMarks: 100,
        passingMarks: 35,
        subjectSlug: 'elementary-maths',
      },
      {
        id: 'test_cds_gk_1',
        title: 'CDS General Knowledge & Defence Affairs Mock',
        slug: 'cds-gk-defence-affairs-1',
        description: 'Comprehensive GK assessment testing Indian Polity, Modern History, General Science, and Current Defence Developments.',
        isFullMock: false,
        durationMinutes: 120,
        totalMarks: 100,
        passingMarks: 35,
        subjectSlug: 'gk',
      },
    ];

    for (const mc of mockConfigs) {
      const subject = this.subjects.find((s) => s.slug === mc.subjectSlug) || this.subjects[0];
      const testItem = {
        id: mc.id,
        title: mc.title,
        slug: mc.slug,
        description: mc.description,
        isPublished: true,
        isFullMock: mc.isFullMock,
        durationMinutes: mc.durationMinutes,
        totalMarks: mc.totalMarks,
        passingMarks: mc.passingMarks,
        subject,
        subjectId: subject?.id,
        sections: [
          {
            id: `sec_${mc.id}_1`,
            name: 'Section 1',
            durationMinutes: mc.durationMinutes,
            orderIndex: 1,
            _count: { testQuestions: this.questions.length || 10 },
            testQuestions: this.questions.slice(0, 10).map((q, idx) => ({
              id: `tq_${mc.id}_${idx}`,
              questionId: q.id,
              orderIndex: idx + 1,
              question: q,
            })),
          },
        ],
        _count: { attempts: 184 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.tests.push(testItem);
    }
  }

  private generateFallbackContent() {
    const defaultSubs = [
      {
        id: 'sub_english',
        name: 'English',
        slug: 'english',
        description: 'UPSC CDS English syllabus',
        icon: 'BookOpen',
        orderIndex: 1,
        chapters: [
          {
            id: 'ch_spotting_errors',
            name: 'Spotting Errors',
            slug: 'spotting-errors',
            orderIndex: 1,
            topics: [{ id: 'top_sva', name: 'Subject-Verb Agreement', slug: 'subject-verb-agreement', orderIndex: 1 }],
          },
        ],
        _count: { chapters: 1, questions: 5 },
      },
      {
        id: 'sub_elementary_maths',
        name: 'Elementary Mathematics',
        slug: 'elementary-maths',
        description: 'Arithmetic, Algebra, Trigonometry, Geometry',
        icon: 'Calculator',
        orderIndex: 2,
        chapters: [],
        _count: { chapters: 0, questions: 5 },
      },
      {
        id: 'sub_gk',
        name: 'General Knowledge',
        slug: 'gk',
        description: 'History, Polity, Geography, Current Defence Affairs',
        icon: 'Globe',
        orderIndex: 3,
        chapters: [],
        _count: { chapters: 0, questions: 5 },
      },
    ];
    this.subjects.push(...defaultSubs);
    this.generateMockTests();
  }
}

export function createDevPrismaProxy(originalClient: any, isConnected: () => boolean): any {
  const store = new DevStore();

  const createModelHandler = (collectionName: keyof DevStore) => ({
    findUnique: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].findUnique(args);
      const list = store[collectionName] as any[];
      if (!list) return null;
      const where = args?.where || {};
      return list.find((item) => matchWhere(item, where)) || null;
    },

    findFirst: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].findFirst(args);
      const list = store[collectionName] as any[];
      if (!list) return null;
      const where = args?.where || {};
      return list.find((item) => matchWhere(item, where)) || null;
    },

    findMany: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].findMany(args);
      const list = store[collectionName] as any[];
      if (!list) return [];
      const where = args?.where || {};
      let filtered = list.filter((item) => matchWhere(item, where));
      if (args?.skip) {
        filtered = filtered.slice(args.skip);
      }
      if (args?.take) {
        filtered = filtered.slice(0, args.take);
      }
      return filtered;
    },

    create: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].create(args);
      const list = store[collectionName] as any[];
      const data = args?.data || {};
      const newRecord = {
        id: data.id || `${collectionName}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };

      // Auto-populate relationships if needed
      if (collectionName === 'users') {
        const studentRole = store.roles.find((r) => r.name === 'STUDENT') || store.roles[0];
        newRecord.roles = [
          {
            id: `ur_${newRecord.id}`,
            userId: newRecord.id,
            roleId: studentRole?.id,
            role: studentRole,
          },
        ];
      }

      if (collectionName === 'questions') {
        if (data.options?.create && Array.isArray(data.options.create)) {
          newRecord.options = data.options.create.map((opt: any, oIdx: number) => ({
            id: `${newRecord.id}_opt_${oIdx}`,
            questionId: newRecord.id,
            orderIndex: opt.orderIndex !== undefined ? opt.orderIndex : oIdx + 1,
            ...opt,
          }));
        } else if (!Array.isArray(newRecord.options)) {
          newRecord.options = [];
        }

        if (data.explanation?.create) {
          newRecord.explanation = data.explanation.create.explanation;
          newRecord.keyConcept = data.explanation.create.keyConcept;
          newRecord.trickFormula = data.explanation.create.trickFormula;
        }

        if (!newRecord.subject && newRecord.subjectId) {
          newRecord.subject = store.subjects.find((s) => s.id === newRecord.subjectId);
        }
        if (!newRecord.chapter && newRecord.chapterId) {
          newRecord.chapter = store.chapters.find((c) => c.id === newRecord.chapterId);
        }
        if (!newRecord.topic && newRecord.topicId) {
          newRecord.topic = store.topics.find((t) => t.id === newRecord.topicId);
        }
        if (newRecord.deletedAt === undefined) {
          newRecord.deletedAt = null;
        }
      }

      list.push(newRecord);
      return newRecord;
    },

    update: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].update(args);
      const list = store[collectionName] as any[];
      const where = args?.where || {};
      const index = list.findIndex((item) => matchWhere(item, where));
      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...(args?.data || {}),
          updatedAt: new Date(),
        };
        return list[index];
      }
      return null;
    },

    upsert: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].upsert(args);
      const list = store[collectionName] as any[];
      const where = args?.where || {};
      const index = list.findIndex((item) => matchWhere(item, where));
      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...(args?.update || {}),
          updatedAt: new Date(),
        };
        return list[index];
      }
      const newRecord = {
        id: args?.create?.id || `${collectionName}_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(args?.create || {}),
      };
      list.push(newRecord);
      return newRecord;
    },

    count: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].count(args);
      const list = store[collectionName] as any[];
      if (!list) return 0;
      const where = args?.where || {};
      return list.filter((item) => matchWhere(item, where)).length;
    },

    delete: async (args: any) => {
      if (isConnected()) return originalClient[collectionName].delete(args);
      const list = store[collectionName] as any[];
      const where = args?.where || {};
      const index = list.findIndex((item) => matchWhere(item, where));
      if (index !== -1) {
        const [deleted] = list.splice(index, 1);
        return deleted;
      }
      return null;
    },
  });

  const modelMap: Record<string, keyof DevStore> = {
    user: 'users',
    role: 'roles',
    rolePermission: 'rolePermissions',
    permission: 'permissions',
    userRole: 'userRoles',
    subject: 'subjects',
    chapter: 'chapters',
    topic: 'topics',
    subtopic: 'subtopics',
    question: 'questions',
    pyqPaper: 'pyqPapers',
    pYQPaper: 'pyqPapers',
    test: 'tests',
    practiceSession: 'practiceSessions',
    practiceAnswer: 'practiceAnswers',
    attempt: 'attempts',
    bookmark: 'bookmarks',
    mistake: 'mistakes',
    auditLog: 'auditLogs',
    notification: 'notifications',
  };

  const handlers: Record<string, any> = {};
  for (const [modelKey, collectionKey] of Object.entries(modelMap)) {
    handlers[modelKey] = createModelHandler(collectionKey);
  }

  let proxyInstance: any = null;
  proxyInstance = new Proxy(originalClient, {
    get(target, prop: string) {
      if (prop === '$queryRawUnsafe' || prop === '$queryRaw') {
        return async () => {
          if (isConnected()) return target[prop].apply(target, arguments as any);
          return [{ '?column?': 1 }];
        };
      }

      if (prop === '$connect') {
        return async () => {
          try {
            await target.$connect();
          } catch {
            // Handled gracefully in dev mode
          }
        };
      }

      if (prop === '$disconnect') {
        return async () => {
          try {
            await target.$disconnect();
          } catch {
            // Handled gracefully
          }
        };
      }

      if (prop === '$transaction') {
        return async (arg: any) => {
          if (typeof arg === 'function') {
            return arg(proxyInstance);
          }
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          return arg;
        };
      }

      if (prop in handlers) {
        return handlers[prop];
      }

      return target[prop];
    },
  });

  return proxyInstance;
}

function matchWhere(item: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  if (where.OR && Array.isArray(where.OR)) {
    return where.OR.some((subWhere: any) => matchWhere(item, subWhere));
  }

  if (where.AND && Array.isArray(where.AND)) {
    return where.AND.every((subWhere: any) => matchWhere(item, subWhere));
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' || key === 'AND') continue;
    if (value === undefined) continue;

    const itemVal = item[key];

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const v = value as Record<string, any>;
      if ('contains' in v) {
        const needle = String(v.contains || '').toLowerCase();
        const haystack = String(itemVal || '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if ('equals' in v && itemVal !== v.equals) return false;
      if ('in' in v && Array.isArray(v.in) && !v.in.includes(itemVal)) return false;
      if ('not' in v && itemVal === v.not) return false;
      if ('gt' in v && !(itemVal > v.gt)) return false;
      if ('lt' in v && !(itemVal < v.lt)) return false;
      if ('some' in v) continue;
      continue;
    }

    if (value === null) {
      if (itemVal !== null && itemVal !== undefined) return false;
      continue;
    }

    if (itemVal !== value) {
      return false;
    }
  }

  return true;
}
