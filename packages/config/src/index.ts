import { z } from 'zod';
import appConfig from './appConfig.json';

export const ExtraFieldSchema = z.object({
  type: z.enum(['string', 'number', 'boolean']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
});

export const ComponentConfigSchema = z.object({
  label: z.string(),
  extraFields: z.record(z.string(), ExtraFieldSchema).optional(),
});

export const AppShellConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  components: z.record(z.string(), ComponentConfigSchema),
  landingPage: z.object({
    heroTitle: z.string(),
    heroSubtitle: z.string(),
  }),
});

export const RootConfigSchema = z.object({
  apps: z.record(z.string(), AppShellConfigSchema),
});

export type ExtraField = z.infer<typeof ExtraFieldSchema>;
export type ComponentConfig = z.infer<typeof ComponentConfigSchema>;
export type AppShellConfig = z.infer<typeof AppShellConfigSchema>;
export type RootConfig = z.infer<typeof RootConfigSchema>;

// Validate the JSON file against the schema
export const parsedConfig: RootConfig = RootConfigSchema.parse(appConfig);

export function getAppConfig(appId: string): AppShellConfig | undefined {
  return parsedConfig.apps[appId];
}
