'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useDisconnect, useActiveWallet, useActiveAccount, useContractEvents } from "thirdweb/react"
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, prepareEvent } from "thirdweb"
import { selectedChain } from "@/lib/chains"
import { Account } from 'viem'

const client = createThirdwebClient({
  clientId: "9d8406e65e57310ca307f9300e8e286b"
})

const contract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "",
  chain: selectedChain,
})

const memeMintedEvent = prepareEvent({
  signature: "event MemeMinted(uint256 indexed tokenId, address indexed minter, string memeUrl)"
})

const transferEvent = prepareEvent({
  signature: "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
})

interface User {
  id: string
  username: string
  address: string
  heheScore: number
}

interface Post {
  id: string
  imageUrl: string
  caption: string
  likes: number
  username: string
  heheScore: number
  hasLiked: boolean
  createdAt: string
  reaction_image_url?: string
  user?: {
    username: string
    heheScore: number
  }
}

interface NFT {
  tokenId: string
  imageUrl: string
  burnEligible?: boolean
  postLikes?: number
}

type Tab = 'posts' | 'nfts' | 'liked'

export default function MePage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [nfts, setNfts] = useState<NFT[]>([])
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(true)
  const [flippedPostId, setFlippedPostId] = useState<string | null>(null)
  const [showScoreNotification, setShowScoreNotification] = useState(false)
  const [earnedScore, setEarnedScore] = useState(0)
  const [burningNftId, setBurningNftId] = useState<string | null>(null)
  const [loadingNftId, setLoadingNftId] = useState<string | null>(null)
  
  const activeAccount = useActiveAccount()
  const { disconnect } = useDisconnect()
  const wallet = useActiveWallet()
  const router = useRouter()

  const { data: events, isLoading: isLoadingEvents } = useContractEvents({
    contract: contract,
    events: [memeMintedEvent, transferEvent]
    
  })

  useEffect(() => {
    if (!activeAccount?.address || isLoadingEvents || !events) {
      setNfts([])
      setIsLoadingNFTs(false)
      return
    }

    const loadNFTsFromEvents = async () => {
      setIsLoadingNFTs(true)
      try {
        const mintEvents = events.filter(event => event.eventName === 'MemeMinted')
        const transferEvents = events.filter(event => event.eventName === 'Transfer')

        const tokenOwners = new Map<string, string>()
        transferEvents
          .sort((a, b) => Number(a.blockNumber - b.blockNumber))
          .forEach(event => {
            tokenOwners.set(event.args.tokenId.toString(), event.args.to.toLowerCase())
          })

        mintEvents.forEach(event => {
          if (!tokenOwners.has(event.args.tokenId.toString())) {
            tokenOwners.set(event.args.tokenId.toString(), event.args.minter.toLowerCase())
          }
        })

        const userAddress = activeAccount.address.toLowerCase()
        const ownedTokenIds = new Set(
          Array.from(tokenOwners.entries())
            .filter(([_, owner]) => owner === userAddress)
            .map(([tokenId]) => tokenId)
        )

        const normalizeUrl = (url: string) => url.split('?')[0].split('.').slice(0, -1).join('.')

        const nftPromises = mintEvents
          .filter(event => ownedTokenIds.has(event.args.tokenId.toString()))
          .map(async (event) => {
            const tokenId = event.args.tokenId.toString()
            const memeUrl = event.args.memeUrl
            const normalizedMemeUrl = normalizeUrl(memeUrl)
            const matchingPost = allPosts.find(post => normalizeUrl(post.imageUrl) === normalizedMemeUrl)

            return {
              tokenId,
              imageUrl: memeUrl,
              burnEligible: matchingPost ? matchingPost.likes > 3 : false,
              postLikes: matchingPost ? matchingPost.likes : 0
            }
          })

        const loadedNfts = await Promise.all(nftPromises)
        setNfts(loadedNfts)
      } catch (error) {
        console.error('Error loading NFTs:', error)
        setNfts([])
      } finally {
        setIsLoadingNFTs(false)
      }
    }

    loadNFTsFromEvents()
  }, [activeAccount?.address, events, isLoadingEvents, allPosts])

  const fetchPosts = async (page: number) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const res = await fetch(`/api/posts/user?page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()

      const postsArray: Post[] = (Array.isArray(data.posts) ? data.posts : [])
        .map((post: any) => ({
          id: post.id || `${Math.random()}`,
          imageUrl: post.imageUrl || '',
          caption: post.caption || '',
          likes: Number(post.likes) || 0,
          username: post.username || post.user?.username || 'Unknown',
          heheScore: Number(post.heheScore) || 0,
          hasLiked: Boolean(post.hasLiked),
          createdAt: post.createdAt || new Date().toISOString(),
          reaction_image_url: post.reaction_image_url,
          user: post.user ? {
            username: post.user.username || '',
            heheScore: Number(post.user.heheScore) || 0
          } : undefined
        }))

      setPosts(postsArray)
      setTotalPages(data.pagination?.totalPages || 1)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching posts:', error)
      if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Invalid token'))) {
        router.push('/login')
      }
    } finally {
      setIsLoading(false)
      setIsInitializing(false)
    }
  }

  const fetchLikedPosts = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch('/api/me/liked', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()

      const postsArray: Post[] = (Array.isArray(data) ? data : [])
        .map((post: any) => ({
          id: post.id || `${Math.random()}`,
          imageUrl: post.imageUrl || '',
          caption: post.caption || '',
          likes: Number(post.likes) || 0,
          username: post.username || post.user?.username || 'Unknown',
          heheScore: Number(post.heheScore) || 0,
          hasLiked: Boolean(post.hasLiked),
          createdAt: post.createdAt || new Date().toISOString(),
          reaction_image_url: post.reaction_image_url,
          user: post.user ? {
            username: post.user.username || '',
            heheScore: Number(post.user.heheScore) || 0
          } : undefined
        }))

      setLikedPosts(postsArray)
    } catch (error) {
      console.error('Error fetching liked posts:', error)
    }
  }

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()

      const normalizedUser: User = {
        id: data.id || '',
        username: data.username || '',
        address: data.address || '',
        heheScore: Number(data.heheScore) || 0
      }
      setUser(normalizedUser)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchAllPosts = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch('/api/posts/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) return
      const data = await res.json()

      const postsArray: Post[] = (Array.isArray(data.posts) ? data.posts : [])
        .map((post: any) => ({
          id: post.id || `${Math.random()}`,
          imageUrl: post.imageUrl || '',
          caption: post.caption || '',
          likes: Number(post.likes) || 0,
          username: post.username || post.user?.username || 'Unknown',
          heheScore: Number(post.heheScore) || 0,
          hasLiked: Boolean(post.hasLiked),
          createdAt: post.createdAt || new Date().toISOString(),
          reaction_image_url: post.reaction_image_url,
          user: post.user ? {
            username: post.user.username || '',
            heheScore: Number(post.user.heheScore) || 0
          } : undefined
        }))
      setAllPosts(postsArray)
    } catch (error) {
      console.error('Error fetching all posts:', error)
    }
  }

  useEffect(() => {
    fetchAllPosts()
  }, [])

  const handleLogout = () => {
    if (wallet) disconnect(wallet)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleBurnNFT = async (tokenId: string, postLikes: number | undefined) => {
    if (!activeAccount) return
    
    setLoadingNftId(tokenId)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const burnAddress = "0x0a29465289046513541F9deCC5Ee8dEEE10f956f"
      const transaction = await prepareContractCall({
        contract,
        method: "function transferFrom(address from, address to, uint256 tokenId)",
        params: [
          activeAccount.address,
          burnAddress,
          BigInt(tokenId)
        ]
      })

      const { transactionHash } = await sendTransaction({
        account: activeAccount as unknown as Account,
        transaction,
      })

      const receipt = await waitForReceipt({
        client,
        chain: selectedChain,
        transactionHash
      })

      if (receipt.status === 'success') {
        setBurningNftId(tokenId)
        setLoadingNftId(null)

        const heheScoreIncrease = Math.floor((postLikes || 0) / 2)
        const res = await fetch('/api/users/updateScore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ scoreIncrease: heheScoreIncrease })
        })

        if (res.ok) {
          setNfts(prev => prev.filter(nft => nft.tokenId !== tokenId))
          setBurningNftId(null)
          if (user) {
            setUser({
              ...user,
              heheScore: user.heheScore + heheScoreIncrease
            })
          }
          setEarnedScore(heheScoreIncrease)
          setShowScoreNotification(true)
          setTimeout(() => setShowScoreNotification(false), 3000)
        }
      }
    } catch (error) {
      console.error('Error burning NFT:', error)
      setLoadingNftId(null)
    }
  }

  useEffect(() => {
    const initializePage = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        
        if (!storedUser || !token) {
          router.push('/login')
          return
        }

        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        
        await Promise.all([
          fetchUserData(),
          fetchPosts(1),
          fetchLikedPosts()
        ])
      } catch (error) {
        console.error('Error initializing page:', error)
        router.push('/login')
      } finally {
        setIsInitializing(false)
      }
    }

    initializePage()
    const refreshInterval = setInterval(fetchUserData, 10000)
    return () => clearInterval(refreshInterval)
  }, [router])

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#1f1f1f] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1f1f1f]">
      <AnimatePresence>
        {showScoreNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-pink-500 text-white px-6 py-4 rounded-lg shadow-xl">
              <p className="text-xl font-bold">+{earnedScore} HEHE Score!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 left-0 right-0 z-10 bg-[#1f1f1f]">
        <div className="relative">
          <div className="absolute inset-0 h-48 bg-gradient-to-b from-pink-500/20 to-transparent" />
          <div className="relative pt-12 px-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Profile</h1>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>

            {user && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">{user.username}</h2>
                  <p className="text-pink-400">HEHE Score: {user.heheScore}</p>
                </div>
                <div className="p-4 bg-[#2f2f2f] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Wallet Address</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(user.address)}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={`https://sepolia.basescan.org/address/${user.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                  <p className="text-sm text-white break-all">{user.address}</p>
                </div>
                <div className="flex space-x-4 border-b border-[#2f2f2f]">
                  {(['posts', 'nfts', 'liked'] as Tab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
                        activeTab === tab ? 'text-pink-500' : 'text-gray-400'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500"
                          initial={false}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-8 pb-24">
          {activeTab === 'posts' && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-4 text-center">
                    <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-white">Loading posts...</p>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-4">
                  {posts.map((post) => (
                    <div key={post.id} className="relative rounded-xl overflow-hidden aspect-square">
                      <Image
                        src={post.imageUrl}
                        alt={post.caption || "Post image"}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-white text-sm font-medium">
                              @{post.user?.username || post.username || user?.username || 'Unknown'}
                            </p>
                            <div className="flex items-center space-x-1 bg-black/40 rounded-full px-2 py-1">
                              <span className="text-sm">🤣</span>
                              <span className="text-sm text-white">{post.likes}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nfts' && (
            <div className="grid grid-cols-2 gap-4 p-4 overflow-y-auto">
              {isLoadingNFTs ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-800 rounded-lg aspect-square" />
                ))
              ) : nfts.length > 0 ? (
                nfts.map((nft) => (
                  <motion.div
                    key={nft.tokenId}
                    className="relative group"
                    animate={burningNftId === nft.tokenId ? {
                      scale: [1, 1.1, 0],
                      opacity: [1, 1, 0]
                    } : { scale: 1, opacity: 1 }}
                    transition={{ duration: burningNftId === nft.tokenId ? 1.5 : 0.3 }}
                  >
                    <div className="relative rounded-xl overflow-hidden aspect-square">
                      <Image
                        src={nft.imageUrl}
                        alt={`NFT ${nft.tokenId}`}
                        fill
                        className="object-cover"
                      />
                      {nft.burnEligible && (
                        <div className="absolute inset-0 border-4 border-pink-500 rounded-xl" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-sm">{nft.postLikes} likes</p>
                      </div>
                    </div>
                    {nft.burnEligible && (
                      <button
                        onClick={() => handleBurnNFT(nft.tokenId, nft.postLikes)}
                        disabled={burningNftId === nft.tokenId || loadingNftId === nft.tokenId}
                        className="absolute bottom-2 right-2 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingNftId === nft.tokenId ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Burning...
                          </>
                        ) : (
                          <>🔥 {Math.floor((nft.postLikes || 0) / 2)}</>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400">
                  No NFTs found
                </div>
              )}
            </div>
          )}

          {activeTab === 'liked' && (
            <div>
              {likedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-gray-400">No liked posts yet</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {likedPosts.map((post) => {
                    const flipped = flippedPostId === post.id
                    return (
                      <div
                        key={post.id}
                        className="relative w-full pb-[100%]"
                        onClick={() => setFlippedPostId(flipped ? null : post.id)}
                      >
                        <motion.div
                          className="absolute inset-0"
                          style={{ transformStyle: 'preserve-3d' }}
                          animate={{ rotateY: flipped ? 180 : 0 }}
                          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                        >
                          <div
                            className="absolute inset-0 bg-[#2f2f2f] rounded-lg overflow-hidden"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <img
                              src={post.imageUrl}
                              alt={post.caption}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-white font-medium mb-1">
                                  @{post.user?.username || post.username}
                                </p>
                                {post.caption && (
                                  <p className="text-sm text-white/80 line-clamp-2 pr-12">
                                    {post.caption}
                                  </p>
                                )}
                                <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-black/40 rounded-full px-2 py-1">
                                  <span className="text-sm">🤣</span>
                                  <span className="text-sm text-white">{post.likes}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            className="absolute inset-0 bg-[#2f2f2f] rounded-lg overflow-hidden"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          >
                            {post.reaction_image_url ? (
                              <img
                                src={post.reaction_image_url}
                                alt="Your reaction"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white">
                                No reaction image
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
