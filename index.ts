import {
  createToolHandler,
  defineToolSet,
  type InputSchemaMetaType,
  type OutputSchemaMetaType,
  type SecretSchemaMetaType
} from '@fastgpt-plugin/sdk-factory';
import z from 'zod';

import { submitGeneration, retrieveTask, retrieveTasks } from './src/client.ts';
import type { TaskResult } from './src/client.ts';

const secretSchema = z.object({
  apiKey: z.string().min(1).meta({
    title: 'Ace Data Cloud API key',
    description: 'Create an application API key at platform.acedata.cloud. Do not include Bearer.',
    isSecret: true
  } satisfies SecretSchemaMetaType)
});

const outputSchema = z.object({
  taskId: z.string().meta({ title: 'Task ID' } satisfies OutputSchemaMetaType),
  traceId: z.string().meta({ title: 'Trace ID' } satisfies OutputSchemaMetaType),
  status: z.enum(['pending', 'succeeded', 'failed']).meta({ title: 'Task status' } satisfies OutputSchemaMetaType),
  success: z.boolean().meta({ title: 'Succeeded' } satisfies OutputSchemaMetaType),
  mediaUrls: z.array(z.string()).meta({ title: 'Media URLs' } satisfies OutputSchemaMetaType),
  costCredits: z.number().nullable().meta({ title: 'Reported Credits' } satisfies OutputSchemaMetaType)
});

const generateHandler = createToolHandler({
  inputSchema: z.object({
    prompt: z.string().trim().min(1).max(10000).meta({ title: 'Prompt', isToolParam: true } satisfies InputSchemaMetaType),
    model: z.string().trim().min(1).max(256).default('wan3.0-video').meta({ title: 'Model' } satisfies InputSchemaMetaType),
    duration: z.union([z.literal(-1), z.number().int().min(2).max(30)]).default(5).meta({ title: 'Duration' } satisfies InputSchemaMetaType),
    resolution: z.string().trim().min(1).max(256).default('720P').meta({ title: 'Resolution' } satisfies InputSchemaMetaType),
    ratio: z.string().trim().min(1).max(256).default('16:9').meta({ title: 'Ratio' } satisfies InputSchemaMetaType),
    audio: z.boolean().default(false).meta({ title: 'Audio' } satisfies InputSchemaMetaType),
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => submitGeneration(input, ctx.secrets?.apiKey ?? '')
});

const retrieveHandler = createToolHandler({
  inputSchema: z.object({
    taskId: z.string().trim().min(1).meta({
      title: 'Task ID',
      description: 'Bind to Generate → Task ID. Querying this ID does not generate again.',
      isToolParam: true
    } satisfies InputSchemaMetaType)
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => retrieveTask(input.taskId, ctx.secrets?.apiKey ?? '')
});

const batchOutputSchema = z.object({
  status: z.enum(['pending', 'succeeded', 'failed']).meta({ title: 'Batch status' } satisfies OutputSchemaMetaType),
  success: z.boolean().meta({ title: 'All succeeded' } satisfies OutputSchemaMetaType),
  taskIds: z.array(z.string()).meta({ title: 'Requested task IDs' } satisfies OutputSchemaMetaType),
  mediaUrls: z.array(z.string()).meta({ title: 'Completed media URLs' } satisfies OutputSchemaMetaType),
  items: z.array(z.object({
    taskId: z.string(),
    traceId: z.string(),
    status: z.enum(['pending', 'succeeded', 'failed']),
    success: z.boolean(),
    mediaUrls: z.array(z.string()),
    costCredits: z.number().nullable(),
  })).meta({ title: 'Tasks' } satisfies OutputSchemaMetaType)
});

const batchHandler = createToolHandler({
  inputSchema: z.object({
    taskIds: z.array(z.string().trim().min(1)).min(1).max(20).meta({
      title: 'Task IDs',
      description: 'Existing task IDs only. Batch retrieval never submits a new generation.'
    } satisfies InputSchemaMetaType)
  }),
  outputSchema: batchOutputSchema,
  secretSchema,
  handler: async (input, ctx) => retrieveTasks(input.taskIds, ctx.secrets?.apiKey ?? '')
});

export default defineToolSet({
  manifest: {
    pluginId: 'acedataWan',
    version: '0.2.0',
    name: { en: 'Ace Data Cloud Wan', 'zh-CN': 'Ace Data Cloud Wan 视频' },
    description: {
      en: 'Generate video with Wan through Ace Data Cloud and retrieve the same task.',
      'zh-CN': '通过 Ace Data Cloud Wan 视频生成并查询同一任务。'
    },
    versionDescription: { en: 'Align API limits and task status handling', 'zh-CN': '对齐 API 限制和任务状态处理' },
    author: 'Ace Data Cloud',
    repoUrl: 'https://github.com/AceDataCloud/WanFastGPT',
    tutorialUrl: 'https://github.com/AceDataCloud/WanFastGPT#quick-start',
    tags: ['multimodal'],
    permission: []
  },
  secretSchema,
  children: [
    {
      id: 'generate',
      name: { en: 'Generate video', 'zh-CN': '生成Wan 视频' },
      description: { en: 'Submit one Wan generation and return its task ID.', 'zh-CN': '提交一次Wan 视频生成并返回任务 ID。' },
      toolDescription: 'Submit once. Do not call again to check a pending task.',
      handler: generateHandler
    },
    {
      id: 'retrieveTasks',
      name: { en: 'Retrieve tasks', 'zh-CN': '批量查询任务' },
      description: { en: 'Read existing task IDs without submitting a generation.', 'zh-CN': '只读查询已有任务 ID，不重新生成。' },
      toolDescription: 'Use only existing task IDs. Each item retains its own pending, failed, or succeeded state.',
      handler: batchHandler
    },
    {
      id: 'retrieveTask',
      name: { en: 'Retrieve task', 'zh-CN': '查询任务' },
      description: { en: 'Read the status and result of an existing Wan task.', 'zh-CN': '读取已有Wan 视频任务的状态和结果。' },
      toolDescription: 'Read an existing task by ID without submitting a new generation.',
      handler: retrieveHandler
    }
  ]
});
