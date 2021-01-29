import React, { useState, useEffect } from "react";
import { Image, ImageBackground, InteractionManager, ImageURISource } from "react-native";
import * as FileSystem from "expo-file-system";
import { checkClear, getImageFilesystemKey } from "../../src/CacheManager";

interface Props {
  isBackground: boolean;
  source: ImageURISource;
}

const CachedImage: React.FC<Props> = (props) => {
  const { isBackground, source, children } = props;
  let mounted: boolean = true;
  let downloadResumable: FileSystem.DownloadResumable | null = null;
  const [imgURI, setImgURI] = useState<string | null>(null);

  useEffect(() => {
    const _interaction = InteractionManager.runAfterInteractions(async () => {
      await imageChangeCheck();
    });

    return () => {
      _interaction && _interaction.cancel();
      mounted = false;
      downloadResumable != null && checkClear(downloadResumable, source);
    };
  }, [source]);

  const imageChangeCheck = async () => {
    if (source.uri) {
      const filesystemURI = await getImageFilesystemKey(source.uri);

      if (source.uri === imgURI || filesystemURI === imgURI) {
        return null;
      }
      loadImage(filesystemURI, source.uri);
    }
  };

  const loadImage = async (filesystemURI: string, remoteURI: string) => {
    if (downloadResumable && downloadResumable._removeSubscription) {
      downloadResumable._removeSubscription();
    }
    try {
      // Use the cached image if it exists
      const metadata = await FileSystem.getInfoAsync(filesystemURI);

      if (metadata.exists) {
        if (mounted) {
          setImgURI(filesystemURI);
        }
        return;
      }

      // otherwise download to cache
      downloadResumable = FileSystem.createDownloadResumable(remoteURI, filesystemURI, {}, (dp) =>
        onDownloadUpdate(dp)
      );

      const imageObject = await downloadResumable.downloadAsync();

      if (mounted) {
        if (imageObject && imageObject?.status == 200) {
          setImgURI(imageObject.uri);
        }
      }
    } catch (err) {
      console.log("Image loading error:", err);
      if (mounted) {
        setImgURI(null);
      }

      const metadata = await FileSystem.getInfoAsync(filesystemURI);
      if (metadata.exists) {
        await FileSystem.deleteAsync(filesystemURI);
      }
    }
  };

  const onDownloadUpdate = (downloadProgress: FileSystem.DownloadProgressData) => {
    if (downloadProgress.totalBytesWritten >= downloadProgress.totalBytesExpectedToWrite) {
      if (downloadResumable && downloadResumable._removeSubscription) {
        downloadResumable._removeSubscription();
      }
      downloadResumable = null;
    }
  };

  let newSource: any = imgURI ? { uri: imgURI } : null;
  if (!newSource && newSource) {
    newSource = { ...newSource, cache: "force-cache" };
  }

  if (isBackground) {
    return (
      <ImageBackground {...props} source={newSource}>
        {children}
      </ImageBackground>
    );
  } else {
    return <Image {...props} source={newSource} />;
  }
};

export default CachedImage;
