import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'
import { createJwtToken } from '@/lib/jwt'
import { v4 as uuidv4 } from 'uuid'

// Define request body interface
interface SignupRequest {
  username: string
  address: string
}

// Define user response interface
interface UserResponse {
  id: string
  username: string
  address: string
  heheScore: number
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body: SignupRequest = await request.json()
    const { username, address } = body

    // Enhanced input validation
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters long' },
        { status: 400 }
      )
    }

    if (!address || !/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json(
        { message: 'Invalid Ethereum address format' },
        { status: 400 }
      )
    }

    // Normalize inputs
    const normalizedUsername = username.trim()
    const normalizedAddress = address.toLowerCase()

    // Check for existing username or address
    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('id, username, address')
      .or(`username.eq.${normalizedUsername},address.eq.${normalizedAddress}`)
      .maybeSingle()

    if (checkError) {
      console.error('Database check error:', checkError)
      return NextResponse.json(
        { message: 'Error checking user existence' },
        { status: 500 }
      )
    }

    if (existingUser) {
      if (existingUser.username === normalizedUsername) {
        return NextResponse.json(
          { message: 'Username is already taken' },
          { status: 409 }
        )
      }
      if (existingUser.address === normalizedAddress) {
        return NextResponse.json(
          { message: 'Address is already registered' },
          { status: 409 }
        )
      }
    }

    // Create new user
    const userId = uuidv4()
    const timestamp = new Date().toISOString()
    const newUser = {
      id: userId,
      username: normalizedUsername,
      address: normalizedAddress,
      heheScore: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    }

    const { data: createdUser, error: createError } = await supabase
      .from('User')
      .insert(newUser)
      .select('id, username, address, heheScore')
      .single()

    if (createError || !createdUser) {
      console.error('User creation error:', createError)
      return NextResponse.json(
        { message: 'Failed to create user', error: createError?.message },
        { status: 500 }
      )
    }

    // Generate JWT token
    const token = createJwtToken({
      id: createdUser.id,
      username: createdUser.username,
      address: createdUser.address
    })

    // Prepare response
    const userResponse: UserResponse = {
      id: createdUser.id,
      username: createdUser.username,
      address: createdUser.address,
      heheScore: createdUser.heheScore
    }

    return NextResponse.json(
      {
        token,
        user: userResponse
      },
      { status: 201 } // Created status code
    )

  } catch (error) {
    console.error('Signup endpoint error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: errorMessage
      },
      { status: 500 }
    )
  }
}