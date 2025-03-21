'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Laugh, MessageCircle, Trophy, WalletIcon } from 'lucide-react'
import { createThirdwebClient } from "thirdweb"
import { selectedChain } from "@/lib/chains"
import { ConnectButton, useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react"

const client = createThirdwebClient({
    clientId: "9d8406e65e57310ca307f9300e8e286b"
})

interface User {
    username: string
    address: string
}

interface AuthResponse {
    token: string
    user: User
}

interface AuthError {
    message: string
}

export default function LoginPage() {
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [username, setUsername] = useState('')
    const [showUsernameForm, setShowUsernameForm] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const activeAccount = useActiveAccount()
    const connectionStatus = useActiveWalletConnectionStatus()
    const router = useRouter()

    // Authentication effect
    useEffect(() => {
        let mounted = true
        let timeoutId: NodeJS.Timeout

        const authenticateUser = async () => {
            if (isAuthenticating || connectionStatus !== 'connected' || !activeAccount?.address) return
            
            setIsAuthenticating(true)
            setError(null)

            try {
                const response = await fetch('/api/auth/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: activeAccount.address }),
                })

                if (!mounted) return

                if (response.ok) {
                    const data: AuthResponse = await response.json()
                    localStorage.setItem('token', data.token)
                    localStorage.setItem('user', JSON.stringify(data.user))
                    await new Promise(resolve => setTimeout(resolve, 100))
                    router.push('/')
                } else {
                    setShowUsernameForm(true)
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
                if (mounted) setError(errorMessage)
            } finally {
                if (mounted) setIsAuthenticating(false)
            }
        }

        if (connectionStatus === 'connected' && activeAccount?.address && !isAuthenticating && !showUsernameForm) {
            timeoutId = setTimeout(authenticateUser, 500)
        }

        return () => {
            mounted = false
            clearTimeout(timeoutId)
        }
    }, [activeAccount?.address, connectionStatus, router])

    // Handle username submission
    const handleUsernameSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeAccount?.address || !username.trim() || isAuthenticating) return

        if (username.length < 3) {
            setError('Username must be at least 3 characters')
            return
        }

        setIsAuthenticating(true)
        setError(null)

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: activeAccount.address, username }),
            })

            if (response.ok) {
                const data: AuthResponse = await response.json()
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                router.push('/')
            } else {
                const errorData: AuthError = await response.json()
                setError(errorData.message || 'Signup failed')
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Signup failed'
            setError(errorMessage)
        } finally {
            setIsAuthenticating(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                        <Laugh className="w-10 h-10" />
                        HeheHub
                    </h1>
                    <p className="text-gray-400 text-lg mb-8">Create and collect meme NFTs</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">
                        {error}
                    </div>
                )}

                {showUsernameForm ? (
                    <form onSubmit={handleUsernameSubmit} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Choose a username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-pink-500 disabled:opacity-50"
                                disabled={isAuthenticating}
                                maxLength={20}
                            />
                            <p className="text-gray-500 text-sm mt-1">Minimum 3 characters</p>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-pink-500 text-white py-2 px-4 rounded hover:bg-pink-600 transition-colors disabled:opacity-50"
                            disabled={isAuthenticating || username.length < 3}
                        >
                            {isAuthenticating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Setting up...
                                </span>
                            ) : (
                                'Continue'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="flex justify-center">
                        <ConnectButton
                            client={client}
                            accountAbstraction={{
                                chain: selectedChain,
                                sponsorGas: true,
                            }}
                            theme="dark"
                        />
                    </div>
                )}

                <div className="mt-8 grid grid-cols-3 gap-4 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                        <MessageCircle className="w-6 h-6 mb-2" />
                        <p>Share Memes</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Trophy className="w-6 h-6 mb-2" />
                        <p>Earn Rewards</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <WalletIcon className="w-6 h-6 mb-2" />
                        <p>Own NFTs</p>
                    </div>
                </div>
            </div>
        </div>
    )
}