// app/verify-otp/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Mail, Phone, Loader2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: true } }
)

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') // 'email' or 'phone'
  const identifier = searchParams.get(type === 'email' ? 'email' : 'phone') // email or phone from signup

  useEffect(() => {
    if (!type || !identifier) {
      setError('Invalid verification link')
      return
    }

    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown, type, identifier])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!otp || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP')
        setIsLoading(false)
        return
      }

      let verifyResult
      if (type === 'email') {
        verifyResult = await supabase.auth.verifyOtp({
          email: identifier!,
          token: otp,
          type: 'signup'
        })
      } else if (type === 'phone') {
        verifyResult = await supabase.auth.verifyOtp({
          phone: identifier!,
          token: otp,
          type: 'sms'
        })
      }

      if (verifyResult?.error) throw verifyResult.error

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      console.error('OTP verification error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError('')

    try {
      if (type === 'email') {
        await supabase.auth.signInWithOtp({
          email: identifier!,
          options: { shouldCreateUser: false }
        })
      } else if (type === 'phone') {
        await supabase.auth.signInWithOtp({
          phone: identifier!,
          options: { shouldCreateUser: false }
        })
      }
      setResendCooldown(60) // 60-second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP')
      console.error('Resend error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1f1f1f] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-[#2f2f2f] p-4 rounded-full">
            {type === 'email' ? (
              <Mail className="w-12 h-12 text-blue-400" />
            ) : (
              <Phone className="w-12 h-12 text-blue-400" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Verify Your {type === 'email' ? 'Email' : 'Phone'}</h1>
            <p className="mt-2 text-[#898989]">
              Enter the 6-digit code sent to {identifier}
            </p>
          </div>
        </div>

        <div className="bg-[#2f2f2f] rounded-lg p-6 space-y-6">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-[#898989] mb-2">
                OTP Code
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#3f3f3f] rounded-lg 
                         text-white placeholder-[#898989] focus:outline-none focus:ring-2 
                         focus:ring-blue-400 focus:border-transparent disabled:opacity-50"
                disabled={isLoading}
                required
                maxLength={6}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg flex items-center justify-between">
                {error}
                <button onClick={() => setError('')} className="text-red-300 hover:text-red-100">
                  ×
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-[#1f1f1f] text-white py-3 px-4 rounded-lg
                       border border-[#3f3f3f] hover:bg-[#2a2a2a] transition-colors
                       flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify OTP</span>
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
              className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
