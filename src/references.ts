import z from 'zod';
const httpsUrl = z.string().url().startsWith('https://');
import { ACTIONS, MEDIA_TYPES } from './model-catalog.ts';
export const referenceInputs = {
  action: z.enum(ACTIONS).default('text2video').meta({ title: 'Mode', description: 'Use image-to-video for Wan 2.6 image and reference-video models.' }),
  imageUrl: httpsUrl.optional().meta({ title: 'First frame image URL' }),
  referenceVideoUrls: z.array(httpsUrl).min(1).optional().meta({ title: 'Reference video URLs' }),
  audioUrl: httpsUrl.optional().meta({ title: 'Reference audio URL' }),
  media: z.array(z.object({ type: z.enum(MEDIA_TYPES), url: httpsUrl })).min(1).max(10).optional().meta({ title: 'Wan 3 reference media' })
};
const schema = z.object(referenceInputs);
export type ReferenceInput = z.input<typeof schema>;
export function referencePayload(input: ReferenceInput & { model: string }) {
  const refs = schema.parse(input);
  if (refs.action === 'image2video' && !refs.imageUrl && !refs.referenceVideoUrls?.length && !refs.media?.length) throw new Error('Image-to-video requires an image, reference video, or supported reference media.');
  if (input.model === 'wan2.6-r2v' && (refs.action !== 'image2video' || !refs.referenceVideoUrls?.length)) throw new Error('Wan 2.6 reference-to-video requires image-to-video mode and reference videos.');
  if (['wan2.6-i2v', 'wan2.6-i2v-flash'].includes(input.model) && (refs.action !== 'image2video' || !refs.imageUrl)) throw new Error('Wan 2.6 image models require image-to-video mode and a first frame image.');
  return { action: refs.action, ...(refs.imageUrl ? { image_url: refs.imageUrl } : {}), ...(refs.referenceVideoUrls ? { reference_video_urls: refs.referenceVideoUrls } : {}), ...(refs.audioUrl ? { audio_url: refs.audioUrl } : {}), ...(refs.media ? { media: refs.media } : {}) };
}
