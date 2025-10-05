import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const { email, userPss, name, surname, birthdate, zipCode, tagIds } = req.body;

      const user = await this.authService.register({
        email,
        userPss,
        name,
        surname,
        birthdate: new Date(birthdate),
        zipCode,
        tagIds: tagIds || [],
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

  getAllTags = async (req: Request, res: Response) => {
    try {
      const tags = await this.authService.getAllTags();

      res.json({
        success: true,
        data: { tags },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
      });
    }
  };

  getTagsByType = async (req: Request, res: Response) => {
    try {
      const tagsByType = await this.authService.getTagsByType();

      res.json({
        success: true,
        data: { tagsByType },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tags by type',
      });
    }
  };

  getTagById = async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.id, 10);

      if (isNaN(tagId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid tag ID provided. getTag-by-id endpoint level',
        });
      }

      const tag = await this.authService.getTagById(tagId);

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: 'Tag not found',
        });
      }

      res.json({ success: true, data: { tag } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch tag' });
    }
  };

  getTagsByList = async (req: Request, res: Response) => {
    try {
      console.log("Request body:", req.body);
      var tagIds = req.body.tagIds;
      console.log("Tag IDs received:", tagIds);

      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid tag IDs provided. endpoint level ${req.body}`,
        });
      }

      const tags = await this.authService.getTagsByList(tagIds);

      res.json({ success: true, data: { tags } });
    } catch (error) {
      res.status(500).json({ success: false, error: `Failed to fetch tags ${tagIds}` });
    }
  };

  createRequest = async (req: AuthRequest, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.user?.userUuid) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      console.log("Request body:", req.body);
      const { tagIds, outDate, countryId } = req.body;
      const userUuid = req.user.userUuid; // Use authenticated user's UUID
      
      const dataPred = {//obtencion por MLServ
        "countryId": countryId,
        "NO2": 12.34,
        "O3": 56.78,
        "CH2O": 9.10,
        "PM": 23.45
      }

      // Obtener los tags para el contexto
      const tags = await this.authService.getTagsByList(tagIds);
        
      const tagNames = tags.map(tag => tag.split(',')[0]);

      const reqInput = {
        countryId: countryId,
        NO2: dataPred.NO2,
        O3: dataPred.O3,
        CH2O: dataPred.CH2O,
        PM: dataPred.PM,
        tags: tags
      };

      //logica de conexion a gemini api
      const key = process.env.GOOGLE_API_KEY;
      let apiResponse = null;
      let summary = "Set GOOGLE_API_KEY in .env.local to use Gemini.";

      if (key) {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
You are an environmental health assistant. Using the air quality data and user context below, produce a concise, actionable recommendation in **strict JSON** that follows the provided schema. Do not include any extra commentary—return **only** valid JSON.

## Context
- Country: ${countryId}
- Date (user-selected): ${outDate ?? "N/A"}
- User tags (preferences & risk): ${tagNames.length ? tagNames.join(", ") : "N/A"}

## Pollutants (current best available; units vary by pollutant)
- NO2: ${dataPred.NO2 ?? "N/A"}
- O3: ${dataPred.O3 ?? "N/A"}
- PM: ${dataPred.PM ?? "N/A"}
- CH2O: ${dataPred.CH2O ?? "N/A"}
- AI (max of above): ${Math.max(dataPred.NO2, dataPred.O3, dataPred.PM, dataPred.CH2O) ?? "N/A"}

## Guidance
- Rate overall outdoor suitability and risk. Identify the *dominant* pollutant driving risk.
- If air is unhealthy, offer safer indoor alternatives.
- Tailor to user tags when relevant (e.g., "Elderly", "Asthma", "Outdoor Activities", "Pet Owner", etc.).
- Keep it practical and medically non-prescriptive.

## SCORING
- outdoor_suitability: 0–100 (higher = safer/more suitable to be outdoors).
- health_risk: 0–100 (higher = riskier).
- confidence: 0–100 (how confident are you given the inputs?).

## JSON SCHEMA (respond EXACTLY in this structure)
{
  "country": string,
  "date": string,
  "dominant_pollutant": "NO2" | "O3" | "PM" | "CH2O" | "Unknown",
  "risk_level_label": "Good" | "Moderate" | "USG" | "Unhealthy" | "Very Unhealthy" | "Hazardous" | "Unknown",
  "scores": {
    "outdoor_suitability": number,
    "health_risk": number,
    "confidence": number
  },
  "pollutants": {
    "NO2": number | null,
    "O3": number | null,
    "PM": number | null,
    "CH2O": number | null,
    "AI": number | null
  },
  "tailored_notes": string[],
  "recommendations": string[],
  "indoor_alternatives": string[],
  "disclaimer": string
}
`.trim();

        const resp = await model.generateContent(prompt);
        const raw = resp.response.text() || "";

        // Limpiar y parsear la respuesta JSON
        const jsonText = raw
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        try {
          apiResponse = JSON.parse(jsonText);
          summary = "OK";
        } catch (err) {
          apiResponse = raw;
          summary = "Failed to parse JSON";
        }
      } else {
        apiResponse = { error: "No API key configured" };
      }

      const reqDB = {
        useruuid: userUuid,
        inputParams: `{"countryId": ${reqInput.countryId}, "NO2": ${reqInput.NO2}, "O3": ${reqInput.O3}, "CH2O": ${reqInput.CH2O}, "PM": ${reqInput.PM}}`,
        outParams: JSON.stringify(apiResponse),
        createdAt: new Date(),
        rating: null,
        tags: tagIds
      }

      // Save the request and its tags to the database
      await this.authService.insertRequest(reqDB);

      res.status(201).json({
        success: true,
        data: {
          recommendation: apiResponse,
          summary: summary
        }
      });
    } catch (error) {
      console.error('Error in createRequest:', error);
      res.status(500).json({
        success: false,
        error: `Failed to create request: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
}