import { useState, useRef, useCallback, useEffect } from 'react'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface VoiceStandupProps {
  onStatusChange?: (status: ConnectionStatus) => void
}

export function VoiceStandup({ onStatusChange }: VoiceStandupProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  const connect = useCallback(async () => {
    try {
      updateStatus('connecting')
      setError(null)

      // Get ephemeral token from our API
      const tokenResponse = await fetch('/api/realtime/session', {
        method: 'POST',
      })
      
      if (!tokenResponse.ok) {
        const err = await tokenResponse.json()
        throw new Error(err.error || 'Failed to get session token')
      }
      
      const { client_secret } = await tokenResponse.json()
      
      if (!client_secret?.value) {
        throw new Error('Invalid session token received')
      }

      // Create peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // Set up audio element for playback
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioElementRef.current = audioEl
      
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      
      dc.onopen = () => {
        updateStatus('connected')
        setIsListening(true)
      }
      
      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          handleRealtimeEvent(event)
        } catch {
          // Ignore parse errors
        }
      }

      dc.onerror = () => {
        updateStatus('error')
        setError('Data channel error')
      }

      // Create and set local description
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Connect to OpenAI Realtime
      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      )

      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to OpenAI Realtime')
      }

      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    } catch (err) {
      console.error('Connection error:', err)
      updateStatus('error')
      setError(err instanceof Error ? err.message : 'Connection failed')
      disconnect()
    }
  }, [updateStatus])

  const disconnect = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
      audioElementRef.current = null
    }
    
    updateStatus('disconnected')
    setIsListening(false)
  }, [updateStatus])

  const handleRealtimeEvent = (event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case 'conversation.item.created':
        // Handle new conversation items
        break
      case 'response.audio_transcript.delta':
        // Streaming transcript
        if (event.delta && typeof event.delta === 'string') {
          setTranscript(prev => {
            const newTranscript = [...prev]
            if (newTranscript.length === 0 || !newTranscript[newTranscript.length - 1].startsWith('AI: ')) {
              newTranscript.push('AI: ' + event.delta)
            } else {
              newTranscript[newTranscript.length - 1] += event.delta
            }
            return newTranscript
          })
        }
        break
      case 'response.audio_transcript.done':
        // Transcript complete
        break
      case 'input_audio_buffer.speech_started':
        setTranscript(prev => [...prev, 'You: (speaking...)'])
        break
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && typeof event.transcript === 'string') {
          setTranscript(prev => {
            const newTranscript = [...prev]
            const lastIdx = newTranscript.findIndex(t => t === 'You: (speaking...)')
            if (lastIdx >= 0) {
              newTranscript[lastIdx] = 'You: ' + event.transcript
            }
            return newTranscript
          })
        }
        break
      case 'error':
        console.error('Realtime error:', event)
        setError(event.error?.message as string || 'Realtime error')
        break
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎙️</span>
          <div>
            <h2 className="text-xl font-bold">Voice Standup</h2>
            <p className="text-sm text-gray-400">Talk to your agent about today's work</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
          {status === 'connecting' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              Connecting...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="mb-6 max-h-64 overflow-y-auto space-y-2">
          {transcript.slice(-10).map((line, i) => (
            <div 
              key={i} 
              className={`text-sm p-2 rounded ${
                line.startsWith('You:') 
                  ? 'bg-blue-500/10 text-blue-300' 
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {status === 'disconnected' || status === 'error' ? (
          <button
            onClick={connect}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>🎤</span>
            Start Voice Standup
          </button>
        ) : status === 'connecting' ? (
          <button
            disabled
            className="px-6 py-3 bg-gray-700 rounded-lg font-medium flex items-center gap-2 opacity-50"
          >
            <span className="animate-spin">⏳</span>
            Connecting...
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>⏹️</span>
            End Standup
          </button>
        )}
      </div>

      {isListening && (
        <p className="text-center text-gray-400 text-sm mt-4">
          🎧 Listening... Just speak naturally to chat with your agent.
        </p>
      )}

      {status === 'disconnected' && (
        <p className="text-center text-gray-500 text-sm mt-4">
          Click "Start Voice Standup" to have a voice conversation about your agent's recent activity.
        </p>
      )}
    </div>
  )
}
