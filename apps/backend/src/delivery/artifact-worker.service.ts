import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DownloadArtifactStatus } from '@prisma/client';
import archiver from 'archiver';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * ArtifactWorkerService implements a durable job runner pattern for artifact generation.
 *
 * Key features:
 * - Polls for PENDING artifacts and processes them
 * - Uses worker tokens for idempotent locking (prevents duplicate processing)
 * - Handles timeouts (stuck GENERATING jobs are recovered)
 * - Implements retry with exponential backoff for transient failures
 * - Survives server restarts (stuck jobs are recovered on next poll)
 *
 * For serverless deployments, this can be triggered via the cron endpoint
 * instead of running as a continuous background worker.
 */
@Injectable()
export class ArtifactWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArtifactWorkerService.name);

  // Configuration
  private readonly POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
  private readonly PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute max processing time
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 second initial backoff
  private readonly MAX_BACKOFF_MS = 30000; // 30 second max backoff
  private readonly ZIP_CONCURRENCY_LIMIT = 5; // Max concurrent file downloads
  private readonly FILE_DOWNLOAD_TIMEOUT_MS = 30000; // 30 seconds per file

  // MVP Guardrails - configurable via env
  private readonly MAX_MEDIA_FILES_PER_ZIP: number;
  private readonly MAX_ZIP_SIZE_BYTES: number;

  // Worker state
  private pollTimeout: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;
  private readonly workerId: string;

  // Storage configuration
  private readonly storageConfigured: boolean;

  constructor(private prisma: PrismaService) {
    this.workerId = crypto.randomUUID();
    this.storageConfigured = !!(
      process.env.UPLOADCARE_PUBLIC_KEY && process.env.UPLOADCARE_PRIVATE_KEY
    );

    // MVP Guardrails - configurable via env with sensible defaults
    this.MAX_MEDIA_FILES_PER_ZIP = parseInt(process.env.MAX_MEDIA_FILES_PER_ZIP || '500', 10);
    this.MAX_ZIP_SIZE_BYTES = parseInt(process.env.MAX_ZIP_SIZE_BYTES || String(2 * 1024 * 1024 * 1024), 10); // 2GB default

    this.logger.log(
      `Artifact worker limits: max ${this.MAX_MEDIA_FILES_PER_ZIP} files, max ${Math.round(this.MAX_ZIP_SIZE_BYTES / 1024 / 1024)}MB`,
    );
  }

  onModuleInit() {
    if (!this.storageConfigured) {
      this.logger.warn(
        'Storage not configured. Artifact worker will not process jobs.',
      );
      return;
    }

    // Start the polling loop
    this.logger.log(`Artifact worker ${this.workerId} starting...`);
    this.schedulePoll();
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    this.logger.log(`Artifact worker ${this.workerId} shutting down...`);
  }

  /**
   * Schedule the next poll cycle.
   */
  private schedulePoll() {
    if (this.isShuttingDown) return;

    this.pollTimeout = setTimeout(async () => {
      await this.poll();
      this.schedulePoll();
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Main poll cycle - find and process pending artifacts.
   * Can also be called directly via cron endpoint for serverless.
   */
  async poll(): Promise<{ processed: number; recovered: number }> {
    if (this.isProcessing) {
      return { processed: 0, recovered: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let recovered = 0;

    try {
      // First, recover any stuck jobs (GENERATING but timed out)
      recovered = await this.recoverStuckJobs();

      // Then, process pending jobs
      const job = await this.claimNextJob();
      if (job) {
        await this.processJob(job);
        processed = 1;
      }
    } catch (error) {
      this.logger.error('Poll cycle error:', error);
    } finally {
      this.isProcessing = false;
    }

    return { processed, recovered };
  }

  /**
   * Recover jobs that are stuck in GENERATING state past timeout.
   * This handles cases where a worker crashed or the server restarted.
   */
  private async recoverStuckJobs(): Promise<number> {
    const timeoutThreshold = new Date(Date.now() - this.PROCESSING_TIMEOUT_MS);

    // Find stuck jobs - GENERATING but processingStartedAt is past timeout
    const stuckJobs = await this.prisma.downloadArtifact.findMany({
      where: {
        status: DownloadArtifactStatus.GENERATING,
        processingStartedAt: {
          lt: timeoutThreshold,
        },
      },
      take: 10, // Process up to 10 stuck jobs at a time
    });

    for (const job of stuckJobs) {
      const shouldRetry = job.retryCount < this.MAX_RETRIES;

      if (shouldRetry) {
        // Reset to PENDING for retry
        await this.prisma.downloadArtifact.update({
          where: { id: job.id },
          data: {
            status: DownloadArtifactStatus.PENDING,
            processingStartedAt: null,
            workerToken: null,
            retryCount: job.retryCount + 1,
            error: `Recovered from stuck state (attempt ${job.retryCount + 1}/${this.MAX_RETRIES})`,
          },
        });
        this.logger.warn(
          `Recovered stuck artifact ${job.id} (retry ${job.retryCount + 1}/${this.MAX_RETRIES})`,
        );
      } else {
        // Max retries exceeded - mark as failed
        await this.prisma.downloadArtifact.update({
          where: { id: job.id },
          data: {
            status: DownloadArtifactStatus.FAILED,
            processingStartedAt: null,
            workerToken: null,
            error: `Generation timed out after ${this.MAX_RETRIES} attempts`,
          },
        });
        this.logger.error(
          `Artifact ${job.id} failed after ${this.MAX_RETRIES} retry attempts`,
        );
      }
    }

    return stuckJobs.length;
  }

  /**
   * Claim the next pending job using optimistic locking.
   * Returns the job if successfully claimed, null otherwise.
   *
   * Uses a two-step atomic pattern:
   * 1. Find the oldest eligible PENDING artifact
   * 2. Conditionally update ONLY that specific row (id + status + workerToken=null)
   * 3. If update affects 0 rows (race condition), return null
   *
   * This ensures exactly one artifact is claimed per call, even under concurrency.
   */
  private async claimNextJob() {
    const workerToken = crypto.randomUUID();

    return await this.prisma.$transaction(async (tx) => {
      // Step 1: Find the oldest eligible PENDING artifact
      const candidate = await tx.downloadArtifact.findFirst({
        where: {
          status: DownloadArtifactStatus.PENDING,
          workerToken: null,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (!candidate) {
        return null;
      }

      // Step 2: Atomically claim this specific artifact
      // The WHERE clause ensures we only update if it's still PENDING and unclaimed
      const result = await tx.downloadArtifact.updateMany({
        where: {
          id: candidate.id,
          status: DownloadArtifactStatus.PENDING,
          workerToken: null,
        },
        data: {
          status: DownloadArtifactStatus.GENERATING,
          processingStartedAt: new Date(),
          workerToken: workerToken,
        },
      });

      // Step 3: If another worker claimed it first (race condition), return null
      if (result.count === 0) {
        return null;
      }

      // Step 4: Fetch the full job with relations
      const job = await tx.downloadArtifact.findUnique({
        where: { id: candidate.id },
        include: {
          project: {
            include: {
              organization: true,
              media: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      return job;
    });
  }

  /**
   * Process a claimed job - generate the zip and upload to storage.
   */
  private async processJob(
    job: Awaited<ReturnType<typeof this.claimNextJob>>,
  ): Promise<void> {
    if (!job) return;

    const { project } = job;
    this.logger.log(`Processing artifact ${job.id} for project ${project.id}`);

    // Filter media based on artifact type
    let media = project.media;
    if (job.type === 'PHOTOS_ONLY') {
      media = media.filter((m) => m.type === 'PHOTO');
    } else if (job.type === 'VIDEOS_ONLY') {
      media = media.filter((m) => m.type === 'VIDEO');
    }

    if (media.length === 0) {
      await this.failJob(job.id, job.workerToken!, 'No media available for download');
      return;
    }

    // MVP Guardrail: Check file count limit
    if (media.length > this.MAX_MEDIA_FILES_PER_ZIP) {
      const errorMsg = `Too many files (${media.length}). Maximum allowed is ${this.MAX_MEDIA_FILES_PER_ZIP} files per download. Please contact support for large exports.`;
      this.logger.warn(`Artifact ${job.id} rejected: ${errorMsg}`);
      await this.failJob(job.id, job.workerToken!, errorMsg);
      return;
    }

    // MVP Guardrail: Estimate total size and check limit (if size info available)
    const estimatedTotalSize = media.reduce((sum, m) => sum + (m.size || 0), 0);
    if (estimatedTotalSize > 0 && estimatedTotalSize > this.MAX_ZIP_SIZE_BYTES) {
      const sizeMB = Math.round(estimatedTotalSize / 1024 / 1024);
      const limitMB = Math.round(this.MAX_ZIP_SIZE_BYTES / 1024 / 1024);
      const errorMsg = `Total size too large (~${sizeMB}MB). Maximum allowed is ${limitMB}MB per download. Please contact support for large exports.`;
      this.logger.warn(`Artifact ${job.id} rejected: ${errorMsg}`);
      await this.failJob(job.id, job.workerToken!, errorMsg);
      return;
    }

    this.logger.log(
      `Artifact ${job.id}: ${media.length} files, ~${Math.round(estimatedTotalSize / 1024 / 1024)}MB estimated`,
    );

    const tempDir = os.tmpdir();
    const tempZipPath = path.join(tempDir, `${job.id}.zip`);

    try {
      // Filter out media without storage keys (e.g., virtual tours with only external URLs)
      const downloadableMedia = media.filter((m): m is typeof m & { key: string } => m.key !== null);

      // Download files with limited concurrency and retry
      const downloadResults = await this.downloadFilesWithRetry(downloadableMedia);

      const successfulDownloads = downloadResults.filter(
        (r): r is NonNullable<typeof r> => r !== null,
      );

      if (successfulDownloads.length === 0) {
        throw new Error('No media files could be downloaded');
      }

      this.logger.log(
        `Downloaded ${successfulDownloads.length}/${media.length} files for artifact ${job.id}`,
      );

      // Create zip archive
      await this.createZipArchive(tempZipPath, successfulDownloads);

      // Get file size
      const stats = fs.statSync(tempZipPath);
      const fileSize = stats.size;

      // Generate filename
      const addressParts = [
        project.addressLine1,
        project.city,
        project.organization.name,
      ].filter(Boolean);
      const address =
        addressParts.length > 0
          ? addressParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')
          : project.id;
      const filename = `${address}.zip`;

      // Upload to storage
      const { storageKey, cdnUrl } = await this.uploadToStorage(
        tempZipPath,
        filename,
      );

      // Mark as complete - verify we still own the lock
      await this.completeJob(job.id, job.workerToken!, {
        key: storageKey,
        cdnUrl,
        filename,
        size: fileSize,
      });

      this.logger.log(`Artifact ${job.id} completed successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to generate artifact ${job.id}:`, error);

      // Determine if we should retry
      const shouldRetry = job.retryCount < this.MAX_RETRIES - 1;

      if (shouldRetry) {
        // Calculate backoff
        const backoffMs = Math.min(
          this.INITIAL_BACKOFF_MS * Math.pow(2, job.retryCount),
          this.MAX_BACKOFF_MS,
        );

        await this.retryJob(job.id, job.workerToken!, error.message, backoffMs);
      } else {
        await this.failJob(job.id, job.workerToken!, error.message);
      }
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp file ${tempZipPath}:`, cleanupError);
      }
    }
  }

  /**
   * Download files with retry and exponential backoff for transient failures.
   */
  private async downloadFilesWithRetry(
    media: { id: string; key: string; cdnUrl: string | null; filename: string }[],
  ): Promise<({ filename: string; buffer: Buffer } | null)[]> {
    const results: ({ filename: string; buffer: Buffer } | null)[] = [];
    const executing: Promise<void>[] = [];

    for (const m of media) {
      const promise = this.downloadFileWithRetry(m).then((result) => {
        results.push(result);
      });

      const e = promise.then(() => {
        executing.splice(executing.indexOf(e), 1);
      });
      executing.push(e);

      if (executing.length >= this.ZIP_CONCURRENCY_LIMIT) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Download a single file with retry logic.
   */
  private async downloadFileWithRetry(
    m: { id: string; key: string; cdnUrl: string | null; filename: string },
    retryCount = 0,
  ): Promise<{ filename: string; buffer: Buffer } | null> {
    const url = m.cdnUrl || `https://ucarecdn.com/${m.key}/`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.FILE_DOWNLOAD_TIMEOUT_MS,
      );

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const safeFilename = m.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          return { filename: safeFilename, buffer };
        } else if (response.status >= 500 && retryCount < 2) {
          // Retry on server errors
          const backoffMs = this.INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
          await this.sleep(backoffMs);
          return this.downloadFileWithRetry(m, retryCount + 1);
        } else {
          this.logger.warn(`Failed to fetch media ${m.id}: HTTP ${response.status}`);
          return null;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.warn(
          `Timeout fetching media ${m.id} after ${this.FILE_DOWNLOAD_TIMEOUT_MS}ms`,
        );
      } else if (retryCount < 2) {
        // Retry on network errors
        const backoffMs = this.INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        await this.sleep(backoffMs);
        return this.downloadFileWithRetry(m, retryCount + 1);
      } else {
        this.logger.warn(`Failed to fetch media ${m.id}:`, error.message);
      }
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a zip archive from downloaded files.
   */
  private async createZipArchive(
    outputPath: string,
    files: { filename: string; buffer: Buffer }[],
  ): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 5 } });
    const output = fs.createWriteStream(outputPath);

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);

      for (const { filename, buffer } of files) {
        archive.append(buffer, { name: filename });
      }

      archive.finalize();
    });
  }

  /**
   * Upload zip to Uploadcare storage.
   */
  private async uploadToStorage(
    filePath: string,
    filename: string,
  ): Promise<{ storageKey: string; cdnUrl: string }> {
    const publicKey = process.env.UPLOADCARE_PUBLIC_KEY!;
    const fileData = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', publicKey);
    formData.append('UPLOADCARE_STORE', '1');
    formData.append('file', new Blob([fileData]), filename);

    const response = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    const storageKey = result.file;
    const cdnUrl = `https://ucarecdn.com/${storageKey}/${encodeURIComponent(filename)}`;

    return { storageKey, cdnUrl };
  }

  /**
   * Mark job as complete (verify we still own the lock).
   */
  private async completeJob(
    jobId: string,
    workerToken: string,
    data: { key: string; cdnUrl: string; filename: string; size: number },
  ): Promise<void> {
    const result = await this.prisma.downloadArtifact.updateMany({
      where: {
        id: jobId,
        workerToken: workerToken, // Verify lock ownership
        status: DownloadArtifactStatus.GENERATING,
      },
      data: {
        status: DownloadArtifactStatus.READY,
        key: data.key,
        cdnUrl: data.cdnUrl,
        filename: data.filename,
        size: data.size,
        processingStartedAt: null,
        workerToken: null,
        error: null,
      },
    });

    if (result.count === 0) {
      this.logger.warn(`Lost lock on artifact ${jobId} - another worker may have taken over`);
    }
  }

  /**
   * Mark job for retry with backoff.
   */
  private async retryJob(
    jobId: string,
    workerToken: string,
    errorMessage: string,
    _backoffMs: number,
  ): Promise<void> {
    await this.prisma.downloadArtifact.updateMany({
      where: {
        id: jobId,
        workerToken: workerToken,
      },
      data: {
        status: DownloadArtifactStatus.PENDING,
        processingStartedAt: null,
        workerToken: null,
        error: `Retrying: ${errorMessage}`,
        retryCount: { increment: 1 },
      },
    });
  }

  /**
   * Mark job as permanently failed.
   */
  private async failJob(
    jobId: string,
    workerToken: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.downloadArtifact.updateMany({
      where: {
        id: jobId,
        workerToken: workerToken,
      },
      data: {
        status: DownloadArtifactStatus.FAILED,
        processingStartedAt: null,
        workerToken: null,
        error: errorMessage,
      },
    });
  }

  /**
   * Retry a failed artifact (called from admin endpoint).
   * Returns the artifact ID if successful.
   */
  async retryFailedArtifact(artifactId: string): Promise<string | null> {
    const artifact = await this.prisma.downloadArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      return null;
    }

    if (artifact.status !== DownloadArtifactStatus.FAILED) {
      throw new Error(`Artifact is not in FAILED state (current: ${artifact.status})`);
    }

    // Reset to PENDING for retry
    await this.prisma.downloadArtifact.update({
      where: { id: artifactId },
      data: {
        status: DownloadArtifactStatus.PENDING,
        processingStartedAt: null,
        workerToken: null,
        retryCount: 0, // Reset retry count for manual retry
        error: null,
      },
    });

    this.logger.log(`Artifact ${artifactId} queued for retry via admin action`);
    return artifactId;
  }
}
