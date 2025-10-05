import { parse } from "csv-parse/sync";
import { Request, Response } from "express";
import { S3Service } from "../services/S3Service";
import { coutygeoId } from "./utils";


export class S3Controller {
    private s3Service: S3Service;

    constructor() {
        this.s3Service = new S3Service();
    }

    listFiles = async (req: Request, res: Response) => {
        try {
            const files = await this.s3Service.listFiles();
            res.status(200).json({
                success: true,
                data: files,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to list files from S3",
            });
        }
    };

    readFile = async (req: Request, res: Response) => {
        try {
            const s3Objects = await this.s3Service.listFiles();

            if (s3Objects.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "No files found in S3 bucket.",
                });
            }

            // Encuentra el archivo con el timestamp más reciente en el nombre
            const latestFile = s3Objects
                .filter((file) => file.Key && file.Key.endsWith(".csv"))
                .reduce((latest, current) => {
                    if (!latest.Key) return current;
                    if (!current.Key) return latest;

                    // El formato es 'YYYY/MM/DD hh:mm.csv'. Lo convertimos a un formato que Date.parse pueda entender.
                    const latestDate = new Date(
                        latest.Key.replace(" ", "T").slice(0, -4) + "Z"
                    );
                    const currentDate = new Date(
                        current.Key.replace(" ", "T").slice(0, -4) + "Z"
                    );

                    return currentDate > latestDate ? current : latest;
                });

            if (!latestFile.Key) {
                return res.status(404).json({
                    success: false,
                    error: "No CSV files found.",
                });
            }

            const fileContent = await this.s3Service.readFile(latestFile.Key);
            const records: string[][] = parse(fileContent, {
                skip_empty_lines: true,
            });

            const dataObjects = [];
            for (let i = 0; i < records.length; i += 5) {
                const chunk = records.slice(i, i + 5);
                dataObjects.push(chunk);
            }

            res.status(200).json({
                success: true,
                data: dataObjects,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to read file from S3",
            });
        }
    };

    getLatestDataByState = async (req: Request, res: Response) => {
        try {
            const s3Objects = await this.s3Service.listFiles();

            if (s3Objects.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "No files found in S3 bucket.",
                });
            }

            const latestFile = s3Objects
                .filter((file) => file.Key && file.Key.endsWith(".csv"))
                .reduce((latest, current) => {
                    if (!latest.Key) return current;
                    if (!current.Key) return latest;

                    const latestDate = new Date(
                        latest.Key.replace(" ", "T").slice(0, -4) + "Z"
                    );
                    const currentDate = new Date(
                        current.Key.replace(" ", "T").slice(0, -4) + "Z"
                    );

                    return currentDate > latestDate ? current : latest;
                });

            if (!latestFile.Key) {
                return res.status(404).json({
                    success: false,
                    error: "No CSV files found.",
                });
            }

            const fileContent = await this.s3Service.readFile(latestFile.Key);
            const records: string[][] = parse(fileContent, {
                skip_empty_lines: true,
            });

            // 1. Mapear datos a objetos por condado
            const countyData = [];
            for (let i = 0; i < records.length; i += 5) {
                const chunk = records.slice(i, i + 5);
                if (chunk.length === 5) {
                    countyData.push({
                        Location: chunk[0][0],
                        NO2: parseFloat(chunk[1][0]),
                        O3: parseFloat(chunk[2][0]),
                        CH2O: parseFloat(chunk[3][0]),
                        PM: parseFloat(chunk[4][0]),
                    });
                }
            }

            const orderedData = [];

            for (var data of countyData) {
                var state = coutygeoId[data.Location as keyof typeof coutygeoId].split(',')[1];
                data["Location"] = state;

                //sort data by alphabetical order with the Location field
                countyData.sort((a, b) => a.Location.localeCompare(b.Location));
                orderedData.push(data);
            }

            const finalData = [];
            var no2 = 0;
            var o3 = 0;
            var ch2o = 0;
            var pm = 0;
            var count = 1;
            var currentState = "";

            for (var data of orderedData) {
                if (data.Location !== currentState) {
                    no2 = no2 / count;
                    o3 = o3 / count;
                    ch2o = ch2o / count;
                    pm = pm / count;
                    finalData.push({
                        Location: currentState,
                        NO2: parseFloat(no2.toFixed(2)),
                        O3: parseFloat(o3.toFixed(2)),
                        CH2O: parseFloat(ch2o.toFixed(2)),
                        PM: parseFloat(pm.toFixed(2)),
                    });
                    no2 = 0;
                    o3 = 0;
                    ch2o = 0;
                    pm = 0;
                    count = 1;
                } else if (currentState === "" || data.Location === currentState) {
                    no2 += data.NO2;
                    o3 += data.O3;
                    ch2o += data.CH2O;
                    pm += data.PM;
                    count++;
                }
                currentState = data.Location;
            }
            res.status(200).json({ success: true, data: finalData });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to process data" });
        }
    };
}
