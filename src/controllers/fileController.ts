import { Request, Response } from "express";
import { getFileData } from "../utils/fileTransformation";

interface StateData {
    State: string;
    NO2: number;
    O3: number;
    CH2O: number;
}

interface GroupedData {
    [key: string]: {
        sumNO2: number;
        sumO3: number;
        sumCH2O: number;
        count: number;
    };
}

var states = [
    "NY",
    "MA",
    "RI",
    "NH",
    "ME",
    "VT",
    "CT",
    "NJ",
    "PA",
    "DE",
    "DC",
    "VA",
    "MD",
    "WV",
    "NC",
    "SC",
    "GA",
    "FL",
    "AL",
    "TN",
    "MS",
    "KY",
    "OH",
    "IN",
    "MI",
    "IA",
    "WI",
    "MN",
    "SD",
    "ND",
    "MT",
    "IL",
    "MO",
    "KS",
    "NE",
    "LA",
    "AR",
    "OK",
    "TX",
    "CO",
    "WY",
    "ID",
    "UT",
    "AZ",
    "NM",
    "NV",
    "CA",
    "HI",
    "OR",
    "WA",
    "AK"
]

export class fileController {
    processMapData = async (req: Request, res: Response) => {
        try {
            var data = await getFileData(); // Llama a getFileData para obtener los datos
            data = data.filter(item => states.includes(item.State)); // Elimina los registros con estado no reconocido

            // Agrupa los datos por estado y suma los valores, elimina los estados no reconocidos en states
            const groupedByState = data.reduce((acc: GroupedData, item) => {
                if (!acc[item.State]) {
                    acc[item.State] = { sumNO2: 0, sumO3: 0, sumCH2O: 0, count: 0 };
                }if (states.includes(item.State)) {
                    acc[item.State].sumNO2 += item.NO2;
                    acc[item.State].sumO3 += item.O3;
                    acc[item.State].sumCH2O += item.CH2O;
                    acc[item.State].count++;
                }
                return acc;
            }, {});

            // Calcula el promedio para cada estado
            const averagedData: StateData[] = Object.keys(groupedByState).map(state => ({
                State: state,
                NO2: parseFloat((groupedByState[state].sumNO2 / groupedByState[state].count).toFixed(2)),
                O3: parseFloat((groupedByState[state].sumO3 / groupedByState[state].count).toFixed(2)),
                CH2O: parseFloat((groupedByState[state].sumCH2O / groupedByState[state].count).toFixed(2)),
            }));

            interface CleanDataItem {
                State: string;
                MaxPollutant: number;
                Pollutant?: string; // Opcional, en caso de que quieras identificar cuál es el contaminante máximo
            }

            var cleanData: CleanDataItem[] = [];
            //genera un arreglo obteniendo el valor más alto de los tres contaminantes para cada estado
            averagedData.forEach(item => {
                const maxPollutant = Math.max(item.NO2, item.O3, item.CH2O);
                var Pollutant = ""
                switch (maxPollutant) {
                    case item.NO2:
                        Pollutant = "NO2";
                        break;
                    case item.O3:
                        Pollutant = "O3";
                        break;
                    case item.CH2O:
                        Pollutant = "CH2O";
                        break;
                }
                cleanData.push({ State: item.State, MaxPollutant: maxPollutant, Pollutant: Pollutant });
            });

            res.status(200).json({ success: true, data: cleanData });

        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to process data" });
        }
    }

    getDataByZip = async (req: Request, res: Response) => {
        try {
            const zip = req.params.zip;
            const data = await getFileData();
            const filteredData = data.filter(item => item.Zip === zip);

            if (filteredData.length === 0) {
                return res.status(404).json({ success: false, message: "No data found for the provided ZIP code." + zip });
            }

            interface CleanDataItem {
                State: string;
                MaxPollutant: number;
                Pollutant?: string; // Opcional, en caso de que quieras identificar cuál es el contaminante máximo
            }

            var cleanData: CleanDataItem[] = [];
            //genera un arreglo obteniendo el valor más alto de los tres contaminantes para cada estado
            filteredData.forEach(item => {
                const maxPollutant = Math.max(item.NO2, item.O3, item.CH2O);
                var Pollutant = ""
                switch (maxPollutant) {
                    case item.NO2:
                        Pollutant = "NO2";
                        break;
                    case item.O3:
                        Pollutant = "O3";
                        break;
                    case item.CH2O:
                        Pollutant = "CH2O";
                        break;
                }
                cleanData.push({ State: item.State, MaxPollutant: maxPollutant, Pollutant: Pollutant });
            });

            res.status(200).json({ success: true, data: cleanData[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to retrieve data" });
        }
    };
}