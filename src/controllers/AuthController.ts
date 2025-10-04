import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const { email, userPss, name, surname, birthdate, zipCode } = req.body;
      
      const user = await this.authService.register({
        email,
        userPss,
        name,
        surname,
        birthdate: new Date(birthdate),
        zipCode,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, userPss } = req.body;
      
      const result = await this.authService.login(email, userPss);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const tokenFromCookie = req.cookies?.refreshToken;
      
      const token = refreshToken || tokenFromCookie;
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token required',
        });
      }

      const result = await this.authService.refreshToken(token);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  };

  logout = async (req: AuthRequest, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const userUuid = req.user?.userUuid;

      await this.authService.logout(refreshToken, userUuid);

      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  };

  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.userUuid) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const user = await this.authService.getUserProfile(req.user.userUuid);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'User not found',
      });
    }
  };
}
