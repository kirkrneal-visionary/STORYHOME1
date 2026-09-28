/**
 * Composition runs on a private Google Cloud Run Job.
 * The number below is Story Home's initial safety setting.
 * It is not a Google Cloud project or regional quota.
 */

export const COUNTY_STORY_COMPOSE_INITIAL_CONCURRENCY = 20;

export const COUNTY_STORY_COMPOSE_VCPU = 2;
export const COUNTY_STORY_COMPOSE_MEMORY = "2Gi";
export const COUNTY_STORY_COMPOSE_DISK = "2Gi";
export const COUNTY_STORY_COMPOSE_TIMEOUT_SEC = 180;

/** Signed read lifetime for frozen clip inputs. Longer than playback reads so a cold job can download them. */
export const COUNTY_STORY_COMPOSE_INPUT_TTL_SEC = 600;

export type ComposeRuntimeConfig = {
  jobName: string | null;
  concurrency: number;
  timeoutSec: number;
  vcpu: number;
  memory: string;
  disk: string;
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

/** Story Home configured concurrency. Raise this later without changing County Stories rules. */
export function storyHomeComposeConcurrency(envValue?: string | null): number {
  return positiveInt(envValue ?? undefined, COUNTY_STORY_COMPOSE_INITIAL_CONCURRENCY);
}

export function readComposeRuntimeConfig(
  env: NodeJS.ProcessEnv | {
    COUNTY_STORY_COMPOSE_JOB?: string;
    COUNTY_STORY_COMPOSE_CONCURRENCY?: string;
    COUNTY_STORY_COMPOSE_TIMEOUT_SEC?: string;
  },
): ComposeRuntimeConfig {
  const jobName = env.COUNTY_STORY_COMPOSE_JOB?.trim() || null;
  return {
    jobName,
    concurrency: storyHomeComposeConcurrency(env.COUNTY_STORY_COMPOSE_CONCURRENCY),
    timeoutSec: positiveInt(env.COUNTY_STORY_COMPOSE_TIMEOUT_SEC, COUNTY_STORY_COMPOSE_TIMEOUT_SEC),
    vcpu: COUNTY_STORY_COMPOSE_VCPU,
    memory: COUNTY_STORY_COMPOSE_MEMORY,
    disk: COUNTY_STORY_COMPOSE_DISK,
  };
}

export function composeConcurrencyIsPlatformQuota(): boolean {
  return false;
}
