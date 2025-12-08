// src/utils/getUserCached.js
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

// In-memory user cache (fastest possible)
const userCache = {};

/**
 * Fetches user data from cache OR Firestore (if not cached).
 * @param {string} uid - Firebase user ID
 * @returns {Promise<object>} User document data
 */
export async function getUserCached(uid) {
    if (!uid) return null;

    // Return cached user if exists
    if (userCache[uid]) {
        return userCache[uid];
    }

    // Fetch from Firestore
    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists()) return null;

    const data = snap.data();

    // Store in cache
    userCache[uid] = data;

    return data;
}

/**
 * Optional: clear cache (for logout)
 */
export function clearUserCache() {
    Object.keys(userCache).forEach((k) => delete userCache[k]);
}
