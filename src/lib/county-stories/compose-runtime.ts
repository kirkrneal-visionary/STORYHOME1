/**
 * Composition runs in a private Cloudflare Container.
 * The number below is Story Home's initial safety setting.
 * It is not a Cloudflare account limit.
 */

export const COUNTY_STORY_COMPOSE_INITIAL_CONCURRENCY = 20;

export const COUNTY_STORY_COMPOSE_VCPU = 1;
export const COUNTY_STORY_COMPOSE_MEMORY_MIB = 3072;
export const COUNTY_STORY_COMPOSE_DISK_MB = 4096;
export const COUNTY_STORY_COMPOSE_TIMEOUT_SEC = 180;

/** Signed read lifetime for frozen clip inputs. Longer than playback reads so a cold container can download them. */
export const COUNTY_STORY_COMPOSE_INPUT_TTL_SEC = 600;

export type ComposeRuntimeConfig = {
  workerUrl: string | null;
  concurrency: number;
  timeoutSec: number;
  vcpu: number;
  memoryMib: number;
  diskMb: number;
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
    COUNTY_STORY_COMPOSE_WORKER_URL?: string;
    COUNTY_STORY_COMPOSE_CONCURRENCY?: string;
    COUNTY_STORY_COMPOSE_TIMEOUT_SEC?: string;
    COUNTY_STORY_COMPOSE_VCPU?: string;
    COUNTY_STORY_COMPOSE_MEMORY_MIB?: string;
    COUNTY_STORY_COMPOSE_DISK_MB?: string;
  },
): ComposeRuntimeConfig {
  const workerUrl = env.COUNTY_STORY_COMPOSE_WORKER_URL?.trim() || null;
  return {
    workerUrl,
    concurrency: storyHomeComposeConcurrency(env.COUNTY_STORY_COMPOSE_CONCURRENCY),
    timeoutSec: positiveInt(env.COUNTY_STORY_COMPOSE_TIMEOUT_SEC, COUNTY_STORY_COMPOSE_TIMEOUT_SEC),
    vcpu: positiveInt(env.COUNTY_STORY_COMPOSE_VCPU, COUNTY_STORY_COMPOSE_VCPU),
    memoryMib: positiveInt(env.COUNTY_STORY_COMPOSE_MEMORY_MIB, COUNTY_STORY_COMPOSE_MEMORY_MIB),
    diskMb: positiveInt(env.COUNTY_STORY_COMPOSE_DISK_MB, COUNTY_STORY_COMPOSE_DISK_MB),
  };
}

export function composeConcurrencyIsPlatformQuota(): boolean {
  return false;
}
