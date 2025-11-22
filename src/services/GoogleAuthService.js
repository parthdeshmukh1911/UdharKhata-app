/**
 * GoogleAuthService.js
 * Safe version compatible with @react-native-google-signin/google-signin
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

class GoogleAuthService {

  /**
   * Sign in with Google
   */
  async signIn() {
    try {
      // Ensure Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Actual sign-in
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo) {
        throw new Error("UNKNOWN_ERROR");
      }

      console.log("Google Sign-In Success:", userInfo.user?.email);

      return userInfo; // Correct modern structure
    } catch (error) {
      console.log("Google Sign-In Error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error("CANCELLED");
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error("IN_PROGRESS");
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("PLAY_SERVICES_NOT_AVAILABLE");
      }

      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.log("Sign out error:", err);
      throw err;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const current = await GoogleSignin.getCurrentUser();
      return current;
    } catch (err) {
      return null;
    }
  }

  /**
   * Check if signed in
   */
  async isSignedIn() {
    try {
      return await GoogleSignin.isSignedIn();
    } catch {
      return false;
    }
  }

  /**
   * Get tokens (Drive upload requires accessToken)
   */
  async getTokens() {
    try {
      return await GoogleSignin.getTokens(); // { idToken, accessToken }
    } catch (err) {
      console.log("Token error:", err);

      if (err.code === statusCodes.SIGN_IN_REQUIRED) {
        throw new Error("SIGN_IN_REQUIRED");
      }

      throw err;
    }
  }

  /**
   * Get Drive Access Token
   */
  async getDriveAccessToken() {
    const { accessToken } = await this.getTokens();
    return accessToken;
  }

  /**
   * Revoke access
   */
  async revokeAccess() {
    try {
      await GoogleSignin.revokeAccess();
    } catch (err) {
      console.log("Revoke error:", err);
    }
  }

  /**
   * Get basic profile
   */
  async getUserProfile() {
    const current = await this.getCurrentUser();
    if (!current) return null;

    return {
      id: current.user.id,
      name: current.user.name,
      email: current.user.email,
      photo: current.user.photo,
    };
  }
}

export default new GoogleAuthService();
