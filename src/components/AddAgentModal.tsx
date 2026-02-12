import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

interface AddAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentAdded?: () => void
}

type Step = 'choose' | 'connect-form' | 'connect-verify'

interface ConnectFormData {
  name: string
  role: string
  team: string
  gatewayUrl: string
  gatewayToken: string
}

export function AddAgentModal({ open, onOpenChange, onAgentAdded }: AddAgentModalProps) {
  const [step, setStep] = useState<Step>('choose')
  const [formData, setFormData] = useState<ConnectFormData>({
    name: '',
    role: '',
    team: '',
    gatewayUrl: '',
    gatewayToken: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState(false)

  const resetModal = () => {
    setStep('choose')
    setFormData({
      name: '',
      role: '',
      team: '',
      gatewayUrl: '',
      gatewayToken: '',
    })
    setVerifying(false)
    setVerifyError(null)
    setVerifySuccess(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal()
    onOpenChange(open)
  }

  const handleVerifyConnection = async () => {
    setVerifying(true)
    setVerifyError(null)
    setVerifySuccess(false)

    try {
      // Convert HTTP URL to WebSocket URL
      let wsUrl = formData.gatewayUrl.trim()
      if (wsUrl.startsWith('http://')) {
        wsUrl = 'ws://' + wsUrl.slice(7)
      } else if (wsUrl.startsWith('https://')) {
        wsUrl = 'wss://' + wsUrl.slice(8)
      } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        wsUrl = 'wss://' + wsUrl
      }
      // Remove trailing slash
      wsUrl = wsUrl.replace(/\/$/, '')
      // Add /ws path for WebSocket endpoint
      wsUrl = wsUrl + '/ws'
      
      // Add token as query param if provided
      if (formData.gatewayToken) {
        wsUrl = wsUrl + '?token=' + encodeURIComponent(formData.gatewayToken)
      }

      // Try to connect via WebSocket with timeout
      const ws = new WebSocket(wsUrl)
      const timeoutId = setTimeout(() => {
        ws.close()
        setVerifyError('Connection timed out after 10 seconds')
        setVerifying(false)
      }, 10000)

      ws.onopen = () => {
        clearTimeout(timeoutId)
        // Send a request in OpenClaw's frame format
        ws.send(JSON.stringify({ 
          type: 'req', 
          id: 'verify-1', 
          method: 'status', 
          params: {} 
        }))
      }

      ws.onmessage = (event) => {
        clearTimeout(timeoutId)
        try {
          const data = JSON.parse(event.data)
          // Any valid JSON response means we're connected
          if (data.result || data.error?.code) {
            setVerifySuccess(true)
            ws.close()
            setTimeout(() => {
              onAgentAdded?.()
              handleOpenChange(false)
            }, 1500)
          } else {
            setVerifyError('Unexpected response from gateway')
          }
        } catch {
          setVerifyError('Invalid response from gateway')
        }
        setVerifying(false)
      }

      ws.onerror = () => {
        clearTimeout(timeoutId)
        setVerifyError('WebSocket connection failed. Check the URL and token.')
        setVerifying(false)
      }

      ws.onclose = (event) => {
        clearTimeout(timeoutId)
        if (!verifySuccess && event.code !== 1000) {
          if (event.reason) {
            setVerifyError(`Connection closed: ${event.reason}`)
          } else if (event.code === 1008) {
            setVerifyError('Unauthorized: Check your gateway token')
          }
          setVerifying(false)
        }
      }
    } catch (error) {
      setVerifyError(`Could not connect: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose' && 'Add Agent'}
            {step === 'connect-form' && 'Connect Your Own Agent'}
            {step === 'connect-verify' && 'Verify Connection'}
          </DialogTitle>
          <DialogDescription>
            {step === 'choose' && 'Choose how you\'d like to add an agent to your dashboard.'}
            {step === 'connect-form' && 'Enter the details of your OpenClaw gateway.'}
            {step === 'connect-verify' && 'Verify the connection to your gateway.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-3 pt-2">
            {/* Deploy to Cloud - Coming Soon */}
            <div className="relative p-4 rounded-xl border border-gray-700/50 bg-gray-800/30 opacity-60 cursor-not-allowed">
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl shrink-0">
                  ☁️
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400">Deploy to Cloud</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Spin up a new OpenClaw agent in the cloud with one click.
                  </p>
                </div>
              </div>
            </div>

            {/* Connect Your Own */}
            <button
              onClick={() => setStep('connect-form')}
              className="w-full p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                  🔗
                </div>
                <div>
                  <h3 className="font-semibold text-white">Connect Your Own</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Connect an existing OpenClaw gateway running on your infrastructure.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 'connect-form' && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My Pi Agent"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Personal Assistant"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team</label>
                <input
                  type="text"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  placeholder="e.g., Engineering"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gateway URL *</label>
              <input
                type="url"
                value={formData.gatewayUrl}
                onChange={(e) => setFormData({ ...formData, gatewayUrl: e.target.value })}
                placeholder="e.g., http://192.168.1.50:18789"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gateway Token (optional)</label>
              <input
                type="password"
                value={formData.gatewayToken}
                onChange={(e) => setFormData({ ...formData, gatewayToken: e.target.value })}
                placeholder="Bearer token for authentication"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setStep('connect-verify')}
                disabled={!formData.name || !formData.gatewayUrl}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 'connect-verify' && (
          <div className="space-y-4 pt-2">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="font-medium text-white mb-3">Connection Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{formData.name}</span>
                </div>
                {formData.role && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Role:</span>
                    <span className="text-white">{formData.role}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Gateway:</span>
                  <span className="text-blue-400 font-mono text-xs">{formData.gatewayUrl}</span>
                </div>
              </div>
            </div>

            {verifyError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                {verifyError}
              </div>
            )}

            {verifySuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
                ✅ Connected successfully! Adding agent...
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('connect-form')} disabled={verifying}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleVerifyConnection} disabled={verifying || verifySuccess}>
                {verifying ? 'Verifying...' : verifySuccess ? 'Done!' : 'Verify & Add'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
