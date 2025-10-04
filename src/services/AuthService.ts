import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
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

  async register(userData: CreateUserData): Promise<UserProfile> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await this.hashPassword(userData.userPss);

    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        userpss: hashedPassword,
        name: userData.name,
        surname: userData.surname,
        birthdate: userData.birthdate,
        zipcode: userData.zipCode,
      },
    });

    return {
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      surname: user.surname,
      birthdate: user.birthdate,
      zipCode: user.zipcode,
      createdAt: user.createdat,
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
    };
  }
}
