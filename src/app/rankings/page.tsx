'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Trophy, Medal, ChevronLeft, ChevronRight } from 'lucide-react'
import { createThirdwebClient, getContract } from "thirdweb"
import { selectedChain } from "@/lib/chains"
import { useReadContract } from "thirdweb/react"

interface User {
  id: string
  username: string
  heheScore: number
  avatarUrl?: string
}

const client = createThirdwebClient({
  clientId: "9d8406e65e57310ca307f9300e8e286b"
})

const contract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_PRIZE || "",
  chain: selectedChain,
})

const USERS_PER_PAGE = 10

export default function RankingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [prizePool, setPrizePool] = useState<bigint>(BigInt(0))

  const { data: prizePoolBalance, isLoading: isPrizePoolLoading } = useReadContract({
    contract,
    method: "function getPrizePool() view returns (uint256)",
    params: [],
  })

  useEffect(() => {
    if (prizePoolBalance !== undefined) {
      setPrizePool(prizePoolBalance)
    }
  }, [prizePoolBalance])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/rankings')
        if (!response.ok) {
          throw new Error(`Failed to fetch rankings: ${response.status}`)
        }
        const data = await response.json()
        setUsers(Array.isArray(data) ? data.map((user: any) => ({
          id: user.id || '',
          username: user.username || 'Unknown',
          heheScore: Number(user.heheScore) || 0,
          avatarUrl: user.avatarUrl
        })) : [])
      } catch (err) {
        console.error('Error fetching rankings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load rankings')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const totalPages = Math.max(1, Math.ceil((users.length - 3) / USERS_PER_PAGE))
  const startIndex = 3 + (currentPage - 1) * USERS_PER_PAGE
  const endIndex = Math.min(startIndex + USERS_PER_PAGE, users.length)
  const currentUsers = users.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const formatETH = (wei: bigint) => {
    return (Number(wei) / 1e18).toFixed(4)
  }

  if (loading || isPrizePoolLoading) {
    return (
      <div className="min-h-screen bg-[#1f1f1f] p-4">
        <h1 className="text-3xl font-bold text-white text-center mb-4">Meme Lords</h1>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Prize Pool: <span className="text-green-400 animate-pulse">Loading...</span>
          </h2>
          <div className="flex justify-center gap-8 text-lg animate-pulse">
            <div className="text-white">1st: <span className="text-green-400">Loading...</span></div>
            <div className="text-white">2nd: <span className="text-green-400">Loading...</span></div>
            <div className="text-white">3rd: <span className="text-green-400">Loading...</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center animate-pulse">
              <div className={`${index === 1 ? 'w-32 h-32' : 'w-24 h-24'} rounded-full bg-[#2f2f2f] mb-4`} />
              <div className={`${index === 1 ? 'h-7 w-32' : 'h-6 w-24'} bg-[#2f2f2f] rounded mb-2`} />
              <div className={`${index === 1 ? 'h-5 w-20' : 'h-4 w-16'} bg-[#2f2f2f] rounded`} />
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto bg-[#2f2f2f] rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-[#3f3f3f] last:border-0 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-[#3f3f3f] rounded" />
                <div className="h-4 w-32 bg-[#3f3f3f] rounded" />
              </div>
              <div className="h-4 w-16 bg-[#3f3f3f] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1f1f1f] flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1f1f1f] p-4">
      <h1 className="text-3xl font-bold text-white text-center mb-4">Meme Lords</h1>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Prize Pool: <span className="text-green-400">{formatETH(prizePool)} ETH</span>
        </h2>
        <div className="flex justify-center gap-8 text-lg">
          <div>
            <span className="text-white">1st: </span>
            <span className="text-green-400">{formatETH(prizePool * BigInt(50) / BigInt(100))} ETH</span>
          </div>
          <div>
            <span className="text-white">2nd: </span>
            <span className="text-green-400">{formatETH(prizePool * BigInt(30) / BigInt(100))} ETH</span>
          </div>
          <div>
            <span className="text-white">3rd: </span>
            <span className="text-green-400">{formatETH(prizePool * BigInt(20) / BigInt(100))} ETH</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
        {users.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center order-2 sm:order-1"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center mb-4"
              >
                <Trophy className="w-12 h-12 text-white" />
              </motion.div>
              <div className="absolute -top-2 -right-2 bg-slate-300 rounded-full p-2">
                <span className="text-lg font-bold">2</span>
              </div>
            </div>
            <p className="text-white font-medium text-lg">{users[1].username}</p>
            <p className="text-pink-500 font-bold">{users[1].heheScore} HEHE</p>
          </motion.div>
        )}

        {users.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center order-1 sm:order-2"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-4"
              >
                <Crown className="w-16 h-16 text-white" />
              </motion.div>
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2">
                <span className="text-xl font-bold">1</span>
              </div>
            </div>
            <p className="text-white font-medium text-xl">{users[0].username}</p>
            <p className="text-yellow-400 font-bold text-lg">{users[0].heheScore} HEHE</p>
          </motion.div>
        )}

        {users.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center order-3"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center mb-4"
              >
                <Medal className="w-12 h-12 text-white" />
              </motion.div>
              <div className="absolute -top-2 -right-2 bg-amber-600 rounded-full p-2">
                <span className="text-lg font-bold">3</span>
              </div>
            </div>
            <p className="text-white font-medium text-lg">{users[2].username}</p>
            <p className="text-amber-500 font-bold">{users[2].heheScore} HEHE</p>
          </motion.div>
        )}
      </div>

      {users.length > 3 && (
        <div className="max-w-2xl mx-auto pb-20">
          <div className="bg-[#2f2f2f] rounded-xl overflow-hidden mb-4 max-h-[50vh] overflow-y-auto">
            {currentUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border-b border-[#3f3f3f] last:border-0"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400 font-medium w-8">{startIndex + index + 1}</span>
                  <span className="text-white">{user.username}</span>
                </div>
                <span className="text-pink-500 font-medium">{user.heheScore} HEHE</span>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6 fixed bottom-24 left-0 right-0">
              <div className="bg-[#1f1f1f]/80 backdrop-blur-sm py-4 px-6 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#2f2f2f] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3f3f3f] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => goToPage(i + 1)}
                      className={`w-8 h-8 rounded-lg ${
                        currentPage === i + 1
                          ? 'bg-pink-500 text-white'
                          : 'bg-[#2f2f2f] text-gray-400 hover:bg-[#3f3f3f]'
                      } transition-colors`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#2f2f2f] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3f3f3f] transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center text-gray-400 mt-8">
          No rankings available yet
        </div>
      )}
    </div>
  )
}