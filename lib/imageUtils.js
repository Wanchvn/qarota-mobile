import * as ImageManipulator from 'expo-image-manipulator';

export const compressImage = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }], // Resize to max 1080px wide (Instagram standard)
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
    );
    return result.uri;
  } catch (error) {
    console.error('Image compression error:', error);
    return uri; // Return original if it fails
  }
};