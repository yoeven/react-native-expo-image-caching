import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import { ImageURISource } from "react-native";

export const checkClear = async (downloadResumable: FileSystem.DownloadResumable, source: ImageURISource) => {
  try {
    if (downloadResumable) {
      console.log("stuck");
      const t = await downloadResumable.pauseAsync();
      if (!source.uri) return;
      const filesystemURI = await getImageFilesystemKey(source.uri);
      const metadata = await FileSystem.getInfoAsync(filesystemURI);
      if (metadata.exists) {
        console.log("deleted");
        await FileSystem.deleteAsync(t.fileUri);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

export const getImageFilesystemKey = async (remoteURI: string) => {
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, remoteURI);
  return `${FileSystem.documentDirectory}${hashed}`;
};
