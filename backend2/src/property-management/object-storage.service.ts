import { Injectable } from "@nestjs/common";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { Readable } from "stream";
import { env } from "../config/env";
import { IMAGE_MIME_TYPES, UploadedBufferFile, validateUploadedFile } from "../common/upload-security";

@Injectable()
export class ObjectStorageService {
  private readonly client = new S3Client({
    endpoint: env.objectStorage.endpoint,
    region: env.objectStorage.region,
    forcePathStyle: env.objectStorage.forcePathStyle,
    credentials: {
      accessKeyId: env.objectStorage.accessKeyId,
      secretAccessKey: env.objectStorage.secretAccessKey,
    },
  });
  private bucketReady = false;

  async putImage(file: UploadedBufferFile, prefix: string) {
    const validated = validateUploadedFile(file, {
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maxBytes: 8 * 1024 * 1024,
    });
    await this.ensureBucket();

    const safePrefix = prefix.replace(/^\/+|\/+$/g, "");
    const key = `${safePrefix}/${Date.now()}-${randomBytes(10).toString("hex")}.${validated.extension}`;
    await this.client.send(new PutObjectCommand({
      Bucket: env.objectStorage.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: validated.mimetype,
    }));

    return {
      bucket: env.objectStorage.bucket,
      objectKey: key,
      mimeType: validated.mimetype,
      sizeBytes: validated.size,
    };
  }

  async getObject(objectKey: string) {
    const result = await this.client.send(new GetObjectCommand({
      Bucket: env.objectStorage.bucket,
      Key: objectKey,
    }));
    return {
      body: result.Body as Readable,
      contentType: result.ContentType || "application/octet-stream",
      contentLength: result.ContentLength,
    };
  }

  async deleteObject(objectKey: string) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: env.objectStorage.bucket,
      Key: objectKey,
    }));
  }

  private async ensureBucket() {
    if (this.bucketReady) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: env.objectStorage.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: env.objectStorage.bucket }));
    }
    this.bucketReady = true;
  }
}
