import {
    GetObjectCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";

export class S3Service {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        if (
            !process.env.AWS_ACCESS_KEY_ID ||
            !process.env.AWS_SECRET_ACCESS_KEY ||
            !process.env.AWS_REGION ||
            !process.env.S3_BUCKET_NAME
        ) {
            throw new Error(
                "AWS credentials or S3 bucket name are not configured in environment variables."
            );
        }

        this.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        this.bucketName = process.env.S3_BUCKET_NAME;
    }

    /**
     * Lista los objetos en el bucket de S3.
     */
    public async listFiles() {
        const command = new ListObjectsV2Command({
            Bucket: this.bucketName,
        });
        const result = await this.s3Client.send(command);
        return result.Contents ?? [];
    }

    public async readFile(filename: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: filename,
        });
        const result = await this.s3Client.send(command);

        if (!result.Body) {
            throw new Error(`File ${filename} has no content.`);
        }

        return result.Body.transformToString("utf-8");
    }
}
