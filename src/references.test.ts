import { afterEach, expect, test, vi } from 'vitest';
import plugin from '../index.ts';
import { submitGeneration } from './client.ts';
import { MODELS } from './model-catalog.ts';
const image = 'https://example.com/authorized.png';
const video = 'https://example.com/authorized.mp4';
const audio = 'https://example.com/authorized.mp3';
const handler = plugin.getToolHandler('generate')!;
afterEach(() => vi.unstubAllGlobals());
async function capture(values: Record<string, unknown>) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'one-submission', status: 'pending' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const input = handler.inputSchema.parse({ prompt: 'One blue paper sphere', ...values });
  await submitGeneration(input, 'test-key');
  expect(fetch).toHaveBeenCalledTimes(1);
  return JSON.parse(fetch.mock.calls[0]![1].body);
}
test('keeps exact custom model IDs available', () => {
  expect(handler.inputSchema.parse({ prompt: 'One blue paper sphere', model: 'future-custom-model' }).model).toBe('future-custom-model');
});

for (const model of MODELS) test(`preserves ${model} and its required references`, async () => {
  const values = model === 'wan2.6-r2v' ? { action: 'image2video', referenceVideoUrls: [video] } : model.includes('i2v') ? { action: 'image2video', imageUrl: image } : { action: 'text2video' };
  const body = await capture({ model, ...values });
  expect(body.model).toBe(model);
  expect(body.action).toBe(values.action);
  if ('imageUrl' in values) expect(body.image_url).toBe(image);
  if ('referenceVideoUrls' in values) expect(body.reference_video_urls).toEqual([video]);
});
test('passes Wan 3 typed media and reference audio without renaming', async () => {
  const media = [{ type: 'first_frame', url: image }, { type: 'reference_video', url: video }, { type: 'reference_audio', url: audio }];
  const body = await capture({ model: 'wan3.0-video', action: 'image2video', media, audioUrl: audio });
  expect(body.media).toEqual(media);
  expect(body.audio_url).toBe(audio);
});
test('rejects missing image or video references before transport', async () => {
  for (const model of ['wan2.6-i2v', 'wan2.6-i2v-flash', 'wan2.6-r2v']) {
    await expect(capture({ model })).rejects.toThrow(/require/);
    expect(fetch).not.toHaveBeenCalled();
  }
});
