import { PrismaClient, ReqHistory } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CreateUserData, UserProfile } from "../models/User";

export class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateAccessToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRE || "1h",
    } as jwt.SignOptions);
  }

  generateRefreshToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): any {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }

  verifyRefreshToken(token: string): any {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  }

  async insertRequest(requestData: {
    useruuid: string;
    inputParams: string;
    outParams: string;
    createdAt: Date;
    rating: number | null;
    tags: number[];
  }): Promise<ReqHistory> {
    return this.prisma.$transaction(async (prisma) => {
      const newRequest = await this.prisma.reqHistory.create({
        data: {
          useruuid: requestData.useruuid,
          inputparams: requestData.inputParams,
          outparams: requestData.outParams,
          createdat: requestData.createdAt,
          rating: requestData.rating,
        },
      });

      const tagIds = requestData.tags || [];
      if (tagIds.length > 0) {
        await prisma.reqTag.createMany({
          data: tagIds.map((tagId) => ({
            reqid: newRequest.reqid,
            tagid: tagId,
          })),
        });
      }

      return newRequest;
    });
  }

  async register(userData: CreateUserData): Promise<UserProfile> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await this.hashPassword(userData.userPss);

    const result = await this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          userpss: hashedPassword,
          name: userData.name,
          surname: userData.surname,
          birthdate: userData.birthdate,
          zipcode: userData.zipCode,
        },
      });

      if (userData.tagIds && userData.tagIds.length > 0) {
        await prisma.userTag.createMany({
          data: userData.tagIds.map((tagId) => ({
            useruuid: user.uuid,
            tagid: tagId,
          })),
        });
      }

      return user;
    });

    return {
      uuid: result.uuid,
      email: result.email,
      name: result.name,
      surname: result.surname,
      birthdate: result.birthdate,
      zipCode: result.zipcode,
      createdAt: result.createdat,
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<{
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await this.comparePassword(password, user.userpss);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const payload = { userUuid: user.uuid, email: user.email };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        useruuid: user.uuid,
        token: refreshToken,
        expiresat: refreshTokenExpiry,
      },
    });

    return {
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        surname: user.surname,
        birthdate: user.birthdate,
        zipCode: user.zipcode,
        createdAt: user.createdat,
        tags:
          (user as any).userTags?.map((ut: any) => ({
            tagId: ut.tag.tagid,
            tagName: ut.tag.tagname || "",
            tagType: ut.tag.tagtype || "",
          })) || [],
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let tokenPayload;
    try {
      tokenPayload = this.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error("Invalid refresh token");
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (
      !storedToken ||
      storedToken.isrevoked ||
      storedToken.expiresat < new Date()
    ) {
      throw new Error("Invalid or expired refresh token");
    }

    const payload = {
      userUuid: tokenPayload.userUuid,
      email: tokenPayload.email,
    };
    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken(payload);

    await this.prisma.refreshToken.update({
      where: { uuid: storedToken.uuid },
      data: { isrevoked: true },
    });

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.refreshToken.create({
      data: {
        useruuid: tokenPayload.useruuid,
        token: newRefreshToken,
        expiresat: refreshTokenExpiry,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken?: string, useruuid?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isrevoked: true },
      });
    } else if (useruuid) {
      await this.prisma.refreshToken.updateMany({
        where: { useruuid, isrevoked: false },
        data: { isrevoked: true },
      });
    }
  }

  async getUserProfile(userUuid: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      include: {
        userTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      surname: user.surname,
      birthdate: user.birthdate,
      zipCode: user.zipcode,
      createdAt: user.createdat,
      tags:
        (user as any).userTags?.map((ut: any) => ({
          tagId: ut.tag.tagid,
          tagName: ut.tag.tagname || "",
          tagType: ut.tag.tagtype || "",
        })) || [],
    };
  }

  async getTagById(
    tagId: number
  ): Promise<{ tagData: string } | null> {
    const tag = await this.prisma.tag.findUnique({
      where: { tagid: tagId },
    });

    if (!tag) {
      return null;
    }

    return { tagData: `${tag.tagname},${tag.tagtype},${tag.tagid}` };
  }

  async getTagsByList(tagIds: number[]): Promise<
    string[]
  > {
    var tags: { tagData: string }[] = [];
    for (const id of tagIds) {
      if (isNaN(id)) {
        throw new Error(`Invalid tag ID provided: ${id}. Service level`);
      } else {
        const tag = await this.getTagById(id);
        if (tag) {
          tags.push(tag);
        }
      }
    }
    const tagTexts: string[] = [];
    for (const utag of tags) {
      tagTexts.push(utag.tagData);
    }
    return tagTexts;
  }

  async getAllTags(): Promise<
    { tagId: number; tagName: string; tagType: string }[]
  > {
    const tags = await this.prisma.tag.findMany({
      orderBy: [{ tagtype: "asc" }, { tagname: "asc" }],
    });

    return tags.map((tag) => ({
      tagId: tag.tagid,
      tagName: tag.tagname || "",
      tagType: tag.tagtype || "",
    }));
  }

  async getTagsByType(): Promise<
    Record<string, { tagId: number; tagName: string }[]>
  > {
    const tags = await this.prisma.tag.findMany({
      orderBy: [{ tagtype: "asc" }, { tagname: "asc" }],
    });

    const tagsByType: Record<string, { tagId: number; tagName: string }[]> = {};

    tags.forEach((tag) => {
      const type = tag.tagtype || "Other";
      if (!tagsByType[type]) {
        tagsByType[type] = [];
      }
      tagsByType[type].push({
        tagId: tag.tagid,
        tagName: tag.tagname || "",
      });
    });

    return tagsByType;
  }
}
