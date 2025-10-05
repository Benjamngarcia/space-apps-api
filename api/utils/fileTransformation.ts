import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";

export async function getFileData(){
    try {
            //obtener los datos del archivo en ./aqi_zipcodes_usa.csv
            const fileContent = await readFile("./api/controllers/aqi_zipcodes_usa.csv");
            const records: string[][] = parse(fileContent, {
                skip_empty_lines: true,
            });

            //mapear los datos a un objeto
            const dataObjects = records.map((record) => ({
                State: record[0],
                Zip: record[1],
                NO2: parseFloat(record[2]),
                O3: parseFloat(record[3]),
                CH2O: parseFloat(record[4]),
            }));

            dataObjects.shift();

            return dataObjects;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : "Failed to process data");
        }
}