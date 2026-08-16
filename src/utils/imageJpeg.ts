import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_GENISLIK = 1600;

export async function fotografiJpegeCevir(uri: string, genislik?: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (genislik && genislik > MAX_GENISLIK) {
    context.resize({ width: MAX_GENISLIK });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.8,
    base64: true,
  });
  if (!saved.base64) throw new Error('Fotoğraf dönüştürülemedi.');
  return saved.base64;
}
