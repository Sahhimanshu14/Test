import { prisma } from './client';
import * as fs from 'fs';
import * as path from 'path';
import {
  AcademyTarget,
  AttemptStatus,
  DifficultyLevel,
  PaymentStatus,
  QuestionPaletteState,
  QuestionStatus,
  QuestionType,
  RoleType,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';
import * as argon2 from 'argon2';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    console.error(
      '⛔ FATAL SECURITY GUARD: Development seed data MUST NOT be loaded into a PRODUCTION database!',
    );
    console.error(
      'Development accounts, default passwords, and mock test attempts will compromise production safety.',
    );
    process.exit(1);
  }

  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Seed Roles
  const roleEntities: Record<string, string> = {};
  const roles = Object.values(RoleType);
  for (const roleName of roles) {
    const r = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Platform role: ${roleName}`,
      },
    });
    roleEntities[roleName] = r.id;
  }
  console.log(`✅ Seeded ${roles.length} roles.`);

  // 2. Seed Permissions
  const permissionsList = [
    { action: 'question:create', description: 'Create draft questions' },
    { action: 'question:update', description: 'Update existing questions' },
    { action: 'question:delete', description: 'Delete or archive questions' },
    { action: 'question:publish', description: 'Publish questions to live bank' },
    { action: 'pyq:create', description: 'Create previous year question papers' },
    { action: 'pyq:update', description: 'Update PYQ papers and questions' },
    { action: 'pyq:publish', description: 'Publish PYQ papers' },
    { action: 'test:create', description: 'Create mock test configurations' },
    { action: 'test:update', description: 'Update mock tests and sections' },
    { action: 'test:publish', description: 'Publish mock tests to students' },
    { action: 'user:read', description: 'Inspect user profiles and student progress' },
    { action: 'user:update', description: 'Update user profiles and roles' },
    { action: 'analytics:read', description: 'Inspect global analytics' },
    { action: 'audit:read', description: 'Inspect security audit logs' },
  ];

  const permissionEntities: Record<string, string> = {};
  for (const perm of permissionsList) {
    const p = await prisma.permission.upsert({
      where: { action: perm.action },
      update: {},
      create: perm,
    });
    permissionEntities[perm.action] = p.id;
  }
  console.log(`✅ Seeded ${permissionsList.length} permissions.`);

  // 2b. Map Permissions to Roles
  const rolePermissionMap: Record<string, string[]> = {
    [RoleType.CONTENT_EDITOR]: [
      'question:create',
      'question:update',
      'pyq:create',
      'pyq:update',
      'test:create',
      'test:update',
    ],
    [RoleType.MODERATOR]: [
      'question:update',
      'question:publish',
      'pyq:publish',
      'test:publish',
    ],
    [RoleType.ADMIN]: [
      'question:create',
      'question:update',
      'question:delete',
      'question:publish',
      'pyq:create',
      'pyq:update',
      'pyq:publish',
      'test:create',
      'test:update',
      'test:publish',
      'user:read',
      'user:update',
      'analytics:read',
      'audit:read',
    ],
    [RoleType.SUPER_ADMIN]: permissionsList.map((p) => p.action),
  };

  for (const [roleName, actions] of Object.entries(rolePermissionMap)) {
    const rId = roleEntities[roleName];
    if (!rId) continue;
    for (const action of actions) {
      const pId = permissionEntities[action];
      if (!pId) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: rId,
            permissionId: pId,
          },
        },
        update: {},
        create: {
          roleId: rId,
          permissionId: pId,
        },
      });
    }
  }

  // 3. Seed Standard Test Users
  const defaultPasswordHash = await argon2.hash('Cdsprep@2026', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const seedUsers = [
    {
      email: 'superadmin@cdsprep.com',
      fullName: 'Super Administrator',
      targetAcademy: AcademyTarget.IMA,
      role: RoleType.SUPER_ADMIN,
    },
    {
      email: 'admin@cdsprep.com',
      fullName: 'CDS Administrator',
      targetAcademy: AcademyTarget.IMA,
      role: RoleType.ADMIN,
    },
    {
      email: 'editor@cdsprep.com',
      fullName: 'Content Editor',
      targetAcademy: AcademyTarget.AFA,
      role: RoleType.CONTENT_EDITOR,
    },
    {
      email: 'moderator@cdsprep.com',
      fullName: 'Quality Moderator',
      targetAcademy: AcademyTarget.INA,
      role: RoleType.MODERATOR,
    },
    {
      email: 'student@cdsprep.com',
      fullName: 'Vikram Singh',
      targetAcademy: AcademyTarget.IMA,
      role: RoleType.STUDENT,
      currentStreak: 5,
      highestStreak: 12,
    },
  ];

  for (const u of seedUsers) {
    const userRecord = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: defaultPasswordHash,
        fullName: u.fullName,
        targetAcademy: u.targetAcademy,
        isEmailVerified: true,
        currentStreak: u.currentStreak || 0,
        highestStreak: u.highestStreak || 0,
      },
    });

    const roleId = roleEntities[u.role];
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userRecord.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: userRecord.id,
          roleId,
        },
      });
    }
  }
  console.log('✅ Seeded superadmin, admin, editor, moderator, and student accounts.');

  // 4. Seed Subjects, Chapters, Topics, and Subtopics from authentic taxonomy dataset
  const taxonomyPath = path.join(__dirname, '../content/taxonomy.json');
  const subjectsData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));

  const createdTopics: Record<string, string> = {};
  const createdSubtopics: Record<string, string> = {};
  const createdSubjects: Record<string, string> = {};
  const createdChapters: Record<string, string> = {};

  for (const sData of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { slug: sData.slug },
      update: {
        name: sData.name,
        description: sData.description,
        icon: sData.icon,
        orderIndex: sData.orderIndex,
      },
      create: {
        slug: sData.slug,
        name: sData.name,
        description: sData.description,
        icon: sData.icon,
        orderIndex: sData.orderIndex,
      },
    });
    createdSubjects[sData.slug] = subject.id;

    for (const cData of sData.chapters) {
      const chapter = await prisma.chapter.upsert({
        where: { subjectId_slug: { subjectId: subject.id, slug: cData.slug } },
        update: { name: cData.name, orderIndex: cData.orderIndex },
        create: {
          subjectId: subject.id,
          slug: cData.slug,
          name: cData.name,
          orderIndex: cData.orderIndex,
        },
      });
      createdChapters[cData.slug] = chapter.id;

      for (const tData of cData.topics) {
        const topic = await prisma.topic.upsert({
          where: { chapterId_slug: { chapterId: chapter.id, slug: tData.slug } },
          update: { name: tData.name, orderIndex: tData.orderIndex },
          create: {
            chapterId: chapter.id,
            slug: tData.slug,
            name: tData.name,
            orderIndex: tData.orderIndex,
          },
        });
        createdTopics[tData.slug] = topic.id;

        if (tData.subtopics) {
          for (const stData of tData.subtopics) {
            const subtopic = await prisma.subtopic.upsert({
              where: { topicId_slug: { topicId: topic.id, slug: stData.slug } },
              update: { name: stData.name, orderIndex: stData.orderIndex },
              create: {
                topicId: topic.id,
                slug: stData.slug,
                name: stData.name,
                orderIndex: stData.orderIndex,
              },
            });
            createdSubtopics[stData.slug] = subtopic.id;
          }
        }
      }
    }
  }
  console.log('✅ Seeded Subjects, Chapters, Topics, and Subtopics from taxonomy.json.');

  // 5. Seed Curated Questions Covering All 7 Question Types with KaTeX
  const curatedQuestionsPath = path.join(__dirname, '../content/curated-questions.json');
  const curatedQuestions = JSON.parse(fs.readFileSync(curatedQuestionsPath, 'utf8'));

  const questionEntities: string[] = [];

  for (const q of curatedQuestions) {
    const subjectId = createdSubjects[q.subjectSlug];
    const chapterId = createdChapters[q.chapterSlug];
    const topicId = createdTopics[q.topicSlug];
    const subtopicId = q.subtopicSlug ? createdSubtopics[q.subtopicSlug] : null;

    if (!subjectId || !chapterId || !topicId) continue;

    const createdQ = await prisma.question.create({
      data: {
        subjectId,
        chapterId,
        topicId,
        subtopicId,
        questionType: q.questionType as QuestionType,
        questionText: q.questionText,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty as DifficultyLevel,
        status: QuestionStatus.PUBLISHED,
        metadata: q.metadata || undefined,
        options: {
          create: q.options.map((opt: any, idx: number) => ({
            identifier: opt.identifier,
            optionText: opt.optionText,
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: idx,
          })),
        },
        explanation: q.explanation
          ? {
              create: {
                explanation: q.explanation.explanation,
                keyConcept: q.explanation.keyConcept || null,
                trickFormula: q.explanation.trickFormula || null,
              },
            }
          : undefined,
      },
    });

    questionEntities.push(createdQ.id);
  }
  console.log(`✅ Seeded ${curatedQuestions.length} curated practice questions covering all question types.`);

  // 6. Seed a Full Mock Test
  const mockTest = await prisma.test.upsert({
    where: { slug: 'cds-full-mock-test-01' },
    update: {},
    create: {
      title: 'CDS Complete Diagnostic Mock Test — IMA / INA / AFA',
      slug: 'cds-full-mock-test-01',
      description:
        'Comprehensive 300-mark full CDS test calibrated to exact UPSC standards with sectional timers and negative marking.',
      isFullMock: true,
      targetAcademy: AcademyTarget.IMA,
      durationMinutes: 120,
      totalMarks: 300,
      passingMarks: 60,
      isPublished: true,
      sections: {
        create: [
          { name: 'English', orderIndex: 1, durationMinutes: 120 },
          { name: 'General Knowledge', orderIndex: 2, durationMinutes: 120 },
          { name: 'Elementary Mathematics', orderIndex: 3, durationMinutes: 120 },
        ],
      },
    },
  });
  console.log(`✅ Seeded Full Mock Test: "${mockTest.title}".`);

  // Link questions to mock test sections
  const sections = await prisma.testSection.findMany({
    where: { testId: mockTest.id },
  });
  for (const section of sections) {
    for (let i = 0; i < questionEntities.length; i++) {
      const qId = questionEntities[i];
      if (!qId) continue;
      await prisma.testQuestion.upsert({
        where: {
          testSectionId_questionId: {
            testSectionId: section.id,
            questionId: qId,
          },
        },
        update: {},
        create: {
          testSectionId: section.id,
          questionId: qId,
          orderIndex: i,
        },
      });
    }
  }

  // 7. Seed Authentic Official UPSC CDS PYQ Papers from pyqs.json
  const pyqsPath = path.join(__dirname, '../content/pyqs.json');
  const pyqPapersData = JSON.parse(fs.readFileSync(pyqsPath, 'utf8'));

  for (const pEntry of pyqPapersData) {
    const pData = pEntry.paper;
    const paper = await prisma.pYQPaper.upsert({
      where: {
        year_session_exam_subjectSlug: {
          year: pData.year,
          session: pData.session,
          exam: pData.exam,
          subjectSlug: pData.subjectSlug,
        },
      },
      update: {
        title: pData.title,
        totalMarks: pData.totalMarks,
        durationMin: pData.durationMin,
        isPublished: pData.isPublished,
        source: pData.source,
        sourceUrl: pData.sourceUrl,
        attribution: pData.attribution,
        licenseType: pData.licenseType,
      },
      create: {
        year: pData.year,
        session: pData.session,
        exam: pData.exam,
        subjectSlug: pData.subjectSlug,
        subjectId: createdSubjects[pData.subjectSlug],
        title: pData.title,
        totalMarks: pData.totalMarks,
        durationMin: pData.durationMin,
        isPublished: pData.isPublished,
        source: pData.source,
        sourceUrl: pData.sourceUrl,
        attribution: pData.attribution,
        licenseType: pData.licenseType,
      },
    });

    for (const qData of pEntry.questions) {
      const subjectId = createdSubjects[pData.subjectSlug];
      const chapterId = createdChapters[qData.chapterSlug];
      const topicId = createdTopics[qData.topicSlug];
      const subtopicId = qData.subtopicSlug ? createdSubtopics[qData.subtopicSlug] : null;

      if (!subjectId || !chapterId || !topicId) continue;

      const qRecord = await prisma.question.create({
        data: {
          subjectId,
          chapterId,
          topicId,
          subtopicId,
          questionType: (qData.questionType as QuestionType) || QuestionType.MCQ_SINGLE,
          questionText: qData.questionText,
          marks: qData.marks,
          negativeMarks: qData.negativeMarks,
          difficulty: qData.difficulty as DifficultyLevel,
          status: QuestionStatus.PUBLISHED,
          source: paper.source,
          year: paper.year,
          exam: paper.exam,
          language: 'en',
          options: {
            create: qData.options.map((opt: any, idx: number) => ({
              identifier: opt.identifier,
              optionText: opt.optionText,
              isCorrect: Boolean(opt.isCorrect),
              orderIndex: idx,
            })),
          },
          explanation: qData.explanation
            ? {
                create: {
                  explanation: typeof qData.explanation === 'string' ? qData.explanation : qData.explanation.explanation,
                  keyConcept: qData.keyConcept || null,
                },
              }
            : undefined,
        },
      });

      await prisma.pYQQuestion.upsert({
        where: {
          pyqPaperId_questionNumber: {
            pyqPaperId: paper.id,
            questionNumber: qData.questionNumber,
          },
        },
        update: {},
        create: {
          pyqPaperId: paper.id,
          questionId: qRecord.id,
          questionNumber: qData.questionNumber,
        },
      });
    }

    console.log(`✅ Seeded Official UPSC PYQ Paper: "${paper.title}" with ${pEntry.questions.length} questions.`);
  }

  // 8. Seed Subscription & Payment for test student
  const studentUser = await prisma.user.findUnique({
    where: { email: 'student@cdsprep.com' },
  });

  if (studentUser) {
    await prisma.subscription.create({
      data: {
        userId: studentUser.id,
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        payments: {
          create: {
            userId: studentUser.id,
            amount: 1499.0,
            currency: 'INR',
            status: PaymentStatus.COMPLETED,
            provider: 'razorpay',
            orderId: 'order_cdsprep_demo_001',
            paymentId: 'pay_cdsprep_demo_001',
          },
        },
      },
    });
    console.log(`✅ Seeded PRO Subscription & Payment for student ${studentUser.email}.`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
