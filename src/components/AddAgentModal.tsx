import { useState } from 'react'

interface AddAgentModalProps {
  isOpen: boolean
  onClose: () => void
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

export function AddAgentModal({ isOpen, onClose, onAgentAdded }: AddAgentModalProps) {
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

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleVerifyConnection = async () => {
    setVerifying(true)
    setVerifyError(null)
    setVerifySuccess(false)

    try {
      // Try to connect to the gateway
      const response = await fetch(`${formData.gatewayUrl}/status`, {
        method: 'GET',
        headers: formData.gatewayToken
          ? { Authorization: `Bearer ${formData.gatewayToken}` }
          : {},
      })

      if (response.ok) {
        setVerifySuccess(true)
        // In a real implementation, we'd save this to a registry
        // For now, just show success
        setTimeout(() => {
          onAgentAdded?.()
          handleClose()
        }, 1500)
      } else {
        setVerifyError(`Connection failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      setVerifyError(`Could not connect: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setVerifying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            {step === 'choose' && 'Add Agent'}
            {step === 'connect-form' && 'Connect Your Own Agent'}
            {step === 'connect-verify' && 'Verify Connection'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'choose' && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-6">
                Choose how you'd like to add an agent to your dashboard.
              </p>

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
                      We'll handle hosting, updates, and uptime.
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
                      Connect an existing OpenClaw gateway running on your machine, 
                      server, or Pi. Full control, your infrastructure.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 'connect-form' && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-4">
                Enter the details of your OpenClaw gateway to connect it.
              </p>

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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Personal Assistant"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team
                  </label>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gateway URL *
                </label>
                <input
                  type="url"
                  value={formData.gatewayUrl}
                  onChange={(e) => setFormData({ ...formData, gatewayUrl: e.target.value })}
                  placeholder="e.g., http://192.168.1.50:18789"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The URL where your OpenClaw gateway is running
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gateway Token (optional)
                </label>
                <input
                  type="password"
                  value={formData.gatewayToken}
                  onChange={(e) => setFormData({ ...formData, gatewayToken: e.target.value })}
                  placeholder="Bearer token for authentication"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('choose')}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('connect-verify')}
                  disabled={!formData.name || !formData.gatewayUrl}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 'connect-verify' && (
            <div className="space-y-4">
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
                  {formData.team && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Team:</span>
                      <span className="text-white">{formData.team}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gateway:</span>
                    <span className="text-blue-400 font-mono text-xs">{formData.gatewayUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token:</span>
                    <span className="text-white">{formData.gatewayToken ? '••••••••' : 'None'}</span>
                  </div>
                </div>
              </div>

              {verifyError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{verifyError}</span>
                  </div>
                </div>
              )}

              {verifySuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Connected successfully! Adding agent...</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('connect-form')}
                  disabled={verifying}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyConnection}
                  disabled={verifying || verifySuccess}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying...
                    </>
                  ) : verifySuccess ? (
                    'Done!'
                  ) : (
                    'Verify & Add'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
