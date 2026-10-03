import { db } from "../../db/index.js";
import {
  advertisements,
  adAnalytics,
  advertisementSlots,
  adPlacements,
} from "../../db/schema.js";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class AdvertisingService {
  async listActiveAds() {
    const now = new Date();
    return await db
      .select()
      .from(advertisements)
      .where(
        and(
          eq(advertisements.status, "active"),
          gte(advertisements.endDate, now),
          lte(advertisements.startDate, now)
        )
      )
      .orderBy(desc(advertisements.createdAt));
  }

  async getAdsForSlot(slotName: string) {
    const slot = await db
      .select()
      .from(advertisementSlots)
      .where(eq(advertisementSlots.slotName, slotName))
      .limit(1);

    if (!slot.length) return [];

    const slotId = slot[0].id;
    const now = new Date();

    const placements = await db
      .select({
        ad: advertisements,
        placement: adPlacements,
      })
      .from(adPlacements)
      .innerJoin(
        advertisements,
        eq(adPlacements.advertisementId, advertisements.id)
      )
      .where(
        and(
          eq(adPlacements.advertisementSlotId, slotId),
          eq(advertisements.status, "active"),
          gte(advertisements.endDate, now),
          lte(advertisements.startDate, now)
        )
      )
      .orderBy(desc(adPlacements.priority));

    return placements.map((p) => p.ad);
  }

  async getAdById(id: string) {
    const result = await db
      .select()
      .from(advertisements)
      .where(eq(advertisements.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createAd(data: {
    title: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
    advertiserName: string;
    category?: string;
    position?: string;
    startDate?: Date;
    endDate?: Date;
    createdBy: string;
  }) {
    const id = uuidv4();
    await db.insert(advertisements).values({
      id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      advertiserName: data.advertiserName,
      category: data.category,
      position: data.position || "sidebar",
      startDate: data.startDate || new Date(),
      endDate: data.endDate,
      createdBy: data.createdBy,
      status: "active",
    });

    return await this.getAdById(id);
  }

  async updateAd(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      linkUrl?: string;
      advertiserName?: string;
      category?: string;
      position?: string;
      startDate?: Date;
      endDate?: Date;
      updatedBy: string;
    }
  ) {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      updatedBy: data.updatedBy,
    };

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.imageUrl) updateData.imageUrl = data.imageUrl;
    if (data.linkUrl) updateData.linkUrl = data.linkUrl;
    if (data.advertiserName) updateData.advertiserName = data.advertiserName;
    if (data.category) updateData.category = data.category;
    if (data.position) updateData.position = data.position;
    if (data.startDate) updateData.startDate = data.startDate;
    if (data.endDate) updateData.endDate = data.endDate;

    await db
      .update(advertisements)
      .set(updateData)
      .where(eq(advertisements.id, id));

    return await this.getAdById(id);
  }

  async deleteAd(id: string) {
    await db.delete(advertisements).where(eq(advertisements.id, id));
    return { success: true };
  }

  async updateAdStatus(id: string, status: "active" | "inactive" | "paused") {
    await db
      .update(advertisements)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(advertisements.id, id));

    return await this.getAdById(id);
  }

  async trackAdView(id: string, ipAddress?: string, userAgent?: string) {
    await db.insert(adAnalytics).values({
      id: uuidv4(),
      advertisementId: id,
      eventType: "view",
      ipAddress,
      userAgent,
    });

    await db
      .update(advertisements)
      .set({
        viewsCount: sql`${advertisements.viewsCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(advertisements.id, id));

    return { success: true };
  }

  async trackAdClick(id: string, userId?: string, ipAddress?: string) {
    await db.insert(adAnalytics).values({
      id: uuidv4(),
      advertisementId: id,
      userId,
      eventType: "click",
      ipAddress,
    });

    await db
      .update(advertisements)
      .set({
        clicksCount: sql`${advertisements.clicksCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(advertisements.id, id));

    return { success: true };
  }

  async getAdAnalytics(id: string) {
    const ad = await this.getAdById(id);
    if (!ad) return null;

    const clicks = await db
      .select({ count: sql<number>`count(*)` })
      .from(adAnalytics)
      .where(
        and(
          eq(adAnalytics.advertisementId, id),
          eq(adAnalytics.eventType, "click")
        )
      );

    const views = await db
      .select({ count: sql<number>`count(*)` })
      .from(adAnalytics)
      .where(
        and(
          eq(adAnalytics.advertisementId, id),
          eq(adAnalytics.eventType, "view")
        )
      );

    const clickCount = clicks[0]?.count || 0;
    const viewCount = views[0]?.count || 0;
    const ctr = viewCount > 0 ? ((clickCount / viewCount) * 100).toFixed(2) : "0";

    return {
      ...ad,
      analyticsViews: viewCount,
      analyticsClicks: clickCount,
      ctr: `${ctr}%`,
    };
  }

  async getAdsDashboard() {
    const totalAds = await db
      .select({ count: sql<number>`count(*)` })
      .from(advertisements);

    const activeAds = await db
      .select({ count: sql<number>`count(*)` })
      .from(advertisements)
      .where(eq(advertisements.status, "active"));

    const allAnalytics = await db
      .select({
        advertiserName: advertisements.advertiserName,
        views: sql<number>`count(case when ${adAnalytics.eventType} = 'view' then 1 end)`,
        clicks: sql<number>`count(case when ${adAnalytics.eventType} = 'click' then 1 end)`,
      })
      .from(adAnalytics)
      .innerJoin(advertisements, eq(adAnalytics.advertisementId, advertisements.id))
      .groupBy(advertisements.advertiserName);

    return {
      totalAds: totalAds[0]?.count || 0,
      activeAds: activeAds[0]?.count || 0,
      totalViews: allAnalytics.reduce((sum, a) => sum + a.views, 0),
      totalClicks: allAnalytics.reduce((sum, a) => sum + a.clicks, 0),
      byAdvertiser: allAnalytics,
    };
  }
}
