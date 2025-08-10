// Sound utility functions for notifications

export const playMessageSound = () => {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.log('Could not play sound:', error)
  }
}

export const showDesktopNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications')
    return
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
        })
      }
    })
  }
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}