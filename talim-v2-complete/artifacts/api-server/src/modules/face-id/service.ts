import { db } from "../../db/index.js";
import { faceProfiles, faceVerificationLogs } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export interface FaceRegistrationData {
  userId: string;
  faceData: Record<string, any>;
  faceDescriptors: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  confidenceScore: number;
  message: string;
}

export class FaceIDService {
  async registerFace(data: FaceRegistrationData): Promise<any> {
    try {
      // Check if user already has a face profile
      const existingProfile = await db
        .select()
        .from(faceProfiles)
        .where(eq(faceProfiles.userId, data.userId))
        .limit(1);

      if (existingProfile.length > 0) {
        // Update existing profile
        await db
          .update(faceProfiles)
          .set({
            faceData: JSON.stringify(data.faceData),
            faceDescriptors: data.faceDescriptors,
            updatedAt: new Date(),
          })
          .where(eq(faceProfiles.userId, data.userId));

        return {
          success: true,
          message: "Face profile updated successfully",
          profileId: existingProfile[0].id,
        };
      }

      // Create new face profile
      const result = await db
        .insert(faceProfiles)
        .values({
          userId: data.userId,
          faceData: JSON.stringify(data.faceData),
          faceDescriptors: data.faceDescriptors,
          isActive: true,
        })
        .returning();

      return {
        success: true,
        message: "Face registered successfully",
        profileId: result[0].id,
      };
    } catch (error) {
      console.error("Error registering face:", error);
      throw error;
    }
  }

  async verifyFace(
    userId: string,
    faceDescriptors: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<VerificationResult> {
    try {
      const profile = await db
        .select()
        .from(faceProfiles)
        .where(and(eq(faceProfiles.userId, userId), eq(faceProfiles.isActive, true)))
        .limit(1);

      if (profile.length === 0) {
        await this.logVerification(userId, "not_found", 0, deviceInfo, ipAddress);
        return {
          success: false,
          verified: false,
          confidenceScore: 0,
          message: "Face profile not found",
        };
      }

      // Compare face descriptors (simplified - in production, use proper ML distance metrics)
      const storedDescriptors = JSON.parse(profile[0].faceDescriptors || "[]");
      const incomingDescriptors = JSON.parse(faceDescriptors || "[]");

      const confidenceScore = this.calculateSimilarity(
        storedDescriptors,
        incomingDescriptors
      );
      const isVerified = confidenceScore > 0.6; // 60% threshold

      // Update last verified time
      if (isVerified) {
        await db
          .update(faceProfiles)
          .set({ lastVerifiedAt: new Date() })
          .where(eq(faceProfiles.id, profile[0].id));
      }

      // Log verification attempt
      await this.logVerification(
        userId,
        isVerified ? "success" : "failed",
        confidenceScore,
        deviceInfo,
        ipAddress
      );

      return {
        success: true,
        verified: isVerified,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        message: isVerified ? "Face verified successfully" : "Face verification failed",
      };
    } catch (error) {
      console.error("Error verifying face:", error);
      throw error;
    }
  }

  async getFaceIDStatus(userId: string): Promise<any> {
    try {
      const profile = await db
        .select()
        .from(faceProfiles)
        .where(eq(faceProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return {
          registered: false,
          active: false,
          message: "No face profile found",
        };
      }

      const recentVerifications = await db
        .select()
        .from(faceVerificationLogs)
        .where(eq(faceVerificationLogs.userId, userId))
        .orderBy((t) => t.createdAt)
        .limit(10);

      return {
        registered: true,
        active: profile[0].isActive,
        registeredAt: profile[0].registeredAt,
        lastVerifiedAt: profile[0].lastVerifiedAt,
        totalVerificationAttempts: recentVerifications.length,
        recentAttempts: recentVerifications,
      };
    } catch (error) {
      console.error("Error getting face ID status:", error);
      throw error;
    }
  }

  async removeFaceID(userId: string): Promise<any> {
    try {
      const profile = await db
        .select()
        .from(faceProfiles)
        .where(eq(faceProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return { success: false, message: "Face profile not found" };
      }

      await db.delete(faceProfiles).where(eq(faceProfiles.userId, userId));

      return { success: true, message: "Face profile removed successfully" };
    } catch (error) {
      console.error("Error removing face ID:", error);
      throw error;
    }
  }

  async getVerificationLogs(userId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(faceVerificationLogs)
        .where(eq(faceVerificationLogs.userId, userId))
        .orderBy((t) => t.createdAt);
    } catch (error) {
      console.error("Error getting verification logs:", error);
      throw error;
    }
  }

  private async logVerification(
    userId: string,
    status: string,
    confidenceScore: number,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await db.insert(faceVerificationLogs).values({
        userId,
        verificationStatus: status,
        confidenceScore,
        deviceInfo,
        ipAddress,
      });
    } catch (error) {
      console.error("Error logging verification:", error);
    }
  }

  private calculateSimilarity(descriptors1: number[], descriptors2: number[]): number {
    if (!Array.isArray(descriptors1) || !Array.isArray(descriptors2)) {
      return 0;
    }

    if (descriptors1.length !== descriptors2.length) {
      return 0;
    }

    // Euclidean distance normalized
    let distance = 0;
    for (let i = 0; i < descriptors1.length; i++) {
      const diff = descriptors1[i] - descriptors2[i];
      distance += diff * diff;
    }

    distance = Math.sqrt(distance);
    // Convert distance to similarity (0 to 1, where 1 is most similar)
    return Math.max(0, 1 - distance / 100);
  }
}
