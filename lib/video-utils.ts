/**
 * Generates a thumbnail image from a video file or URL
 */
export const generateVideoThumbnail = (
  videoSrc: string | File, 
  seekTime: number = 1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      reject(new Error('Canvas context not available'))
      return
    }

    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Seek to the specified time
      video.currentTime = Math.min(seekTime, video.duration)
    }

    video.onseeked = () => {
      try {
        // Draw the current frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert canvas to data URL
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
        
        // Clean up
        video.remove()
        canvas.remove()
        
        resolve(thumbnail)
      } catch (error) {
        reject(error)
      }
    }

    video.onerror = (error) => {
      reject(error)
    }

    video.onabort = () => {
      reject(new Error('Video loading aborted'))
    }

    // Set the video source
    if (videoSrc instanceof File) {
      video.src = URL.createObjectURL(videoSrc)
    } else {
      video.src = videoSrc
    }

    // Start loading
    video.load()
  })
}

/**
 * Creates a thumbnail from video element at current time
 */
export const captureVideoFrame = (videoElement: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas context not available')
  }

  // Set canvas dimensions
  canvas.width = videoElement.videoWidth || videoElement.clientWidth
  canvas.height = videoElement.videoHeight || videoElement.clientHeight

  // Draw current frame
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

  // Return as data URL
  return canvas.toDataURL('image/jpeg', 0.8)
}

/**
 * Preloads video metadata and returns video info
 */
export const getVideoInfo = (videoSrc: string | File): Promise<{
  duration: number
  width: number
  height: number
  thumbnail: string
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = async () => {
      try {
        const thumbnail = await generateVideoThumbnail(videoSrc, 1)
        
        resolve({
          duration: Math.round(video.duration),
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnail
        })
      } catch (error) {
        reject(error)
      } finally {
        video.remove()
      }
    }

    video.onerror = reject

    // Set source
    if (videoSrc instanceof File) {
      video.src = URL.createObjectURL(videoSrc)
    } else {
      video.src = videoSrc
    }

    video.load()
  })
}