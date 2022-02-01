import React, { createContext, useContext, useEffect, useState } from 'react'
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from 'firebase/auth'

import { auth } from '../util/firebase'

const AuthContext = createContext({
    currentUser: null,
    signInWithGoogle: () => Promise,
    logout: () => Promise,
})

export const useAuth = () => useContext(AuthContext)

const AuthContextProvider: React.FC = ({ children }) => {

    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user ? user : null)
        })
        return () => {
            unsubscribe()
        }
    }, [])

    // called upon current user signing in or out.
    useEffect(() => {
        console.log('The user is', currentUser?.displayName)
    }, [currentUser])

    function logout() {
        currentUser ? console.log('user signed out!') : console.error('attempted to sign out while no users were signed in!') 
        return signOut(auth)
    }

    function signInWithGoogle() {
        const provider = new GoogleAuthProvider()
        return signInWithPopup(auth, provider)
    }

    const value: any = {
        currentUser,
        signInWithGoogle,
        logout
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContextProvider