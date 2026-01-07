import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactWorkerService } from './artifact-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { DownloadArtifactStatus } from '@prisma/client';

describe('ArtifactWorkerService', () => {
  let service: ArtifactWorkerService;

  // Track all artifacts to simulate database state
  let mockArtifacts: any[];

  const createMockArtifact = (
    id: string,
    status: DownloadArtifactStatus,
    createdAt: Date,
    workerToken: string | null = null,
  ) => ({
    id,
    status,
    createdAt,
    workerToken,
    processingStartedAt: null,
    retryCount: 0,
    projectId: `project-${id}`,
    type: 'ALL_MEDIA',
    project: {
      id: `project-${id}`,
      addressLine1: '123 Test St',
      city: 'Test City',
      organization: { id: 'org-1', name: 'Test Org' },
      media: [],
    },
  });

  const mockPrismaService = {
    $transaction: jest.fn(async (callback) => {
      // Execute the transaction callback with a mock tx object
      return callback(mockPrismaService);
    }),
    downloadArtifact: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset artifacts before each test
    mockArtifacts = [];

    // Reset all mocks
    jest.clearAllMocks();

    // Set up environment variables for storage
    process.env.UPLOADCARE_PUBLIC_KEY = 'test-key';
    process.env.UPLOADCARE_PRIVATE_KEY = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactWorkerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ArtifactWorkerService>(ArtifactWorkerService);
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.UPLOADCARE_PUBLIC_KEY;
    delete process.env.UPLOADCARE_PRIVATE_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('claimNextJob - atomic single claim', () => {
    it('should claim exactly ONE artifact when multiple PENDING artifacts exist', async () => {
      // Create 5 PENDING artifacts with different timestamps
      const now = new Date();
      mockArtifacts = [
        createMockArtifact('artifact-1', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 5000)),
        createMockArtifact('artifact-2', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 4000)),
        createMockArtifact('artifact-3', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 3000)),
        createMockArtifact('artifact-4', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 2000)),
        createMockArtifact('artifact-5', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 1000)),
      ];

      // Mock findFirst to return the oldest PENDING artifact
      mockPrismaService.downloadArtifact.findFirst.mockResolvedValue({
        id: mockArtifacts[0].id,
      });

      // Mock updateMany to simulate claiming exactly one artifact
      mockPrismaService.downloadArtifact.updateMany.mockImplementation(async (args) => {
        // Verify the WHERE clause targets a specific artifact ID
        expect(args.where.id).toBeDefined();
        expect(args.where.status).toBe(DownloadArtifactStatus.PENDING);
        expect(args.where.workerToken).toBeNull();

        // Simulate successful claim of exactly one row
        return { count: 1 };
      });

      // Mock findUnique to return the full artifact with relations
      mockPrismaService.downloadArtifact.findUnique.mockResolvedValue(mockArtifacts[0]);

      // Call claimNextJob (using private method via any cast for testing)
      const claimNextJob = (service as any).claimNextJob.bind(service);
      const claimedJob = await claimNextJob();

      // Assertions
      expect(claimedJob).not.toBeNull();
      expect(claimedJob.id).toBe('artifact-1');

      // Verify findFirst was called to get a candidate
      expect(mockPrismaService.downloadArtifact.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.downloadArtifact.findFirst).toHaveBeenCalledWith({
        where: {
          status: DownloadArtifactStatus.PENDING,
          workerToken: null,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      // Verify updateMany was called with specific ID (NOT a blanket update)
      expect(mockPrismaService.downloadArtifact.updateMany).toHaveBeenCalledTimes(1);
      const updateCall = mockPrismaService.downloadArtifact.updateMany.mock.calls[0][0];
      expect(updateCall.where.id).toBe('artifact-1');

      // Verify findUnique was called to fetch full artifact
      expect(mockPrismaService.downloadArtifact.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return null when no PENDING artifacts exist', async () => {
      // Mock findFirst to return null (no pending artifacts)
      mockPrismaService.downloadArtifact.findFirst.mockResolvedValue(null);

      const claimNextJob = (service as any).claimNextJob.bind(service);
      const claimedJob = await claimNextJob();

      expect(claimedJob).toBeNull();
      expect(mockPrismaService.downloadArtifact.updateMany).not.toHaveBeenCalled();
    });

    it('should return null when race condition occurs (another worker claimed first)', async () => {
      const now = new Date();
      mockArtifacts = [
        createMockArtifact('artifact-1', DownloadArtifactStatus.PENDING, now),
      ];

      // Mock findFirst to return a candidate
      mockPrismaService.downloadArtifact.findFirst.mockResolvedValue({
        id: 'artifact-1',
      });

      // Mock updateMany to return 0 (another worker claimed it)
      mockPrismaService.downloadArtifact.updateMany.mockResolvedValue({ count: 0 });

      const claimNextJob = (service as any).claimNextJob.bind(service);
      const claimedJob = await claimNextJob();

      // Should return null due to race condition
      expect(claimedJob).toBeNull();
      expect(mockPrismaService.downloadArtifact.findUnique).not.toHaveBeenCalled();
    });

    it('should only update the specific artifact ID, not all PENDING artifacts', async () => {
      const now = new Date();
      mockArtifacts = [
        createMockArtifact('artifact-1', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 2000)),
        createMockArtifact('artifact-2', DownloadArtifactStatus.PENDING, new Date(now.getTime() - 1000)),
        createMockArtifact('artifact-3', DownloadArtifactStatus.PENDING, now),
      ];

      mockPrismaService.downloadArtifact.findFirst.mockResolvedValue({ id: 'artifact-1' });
      mockPrismaService.downloadArtifact.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.downloadArtifact.findUnique.mockResolvedValue(mockArtifacts[0]);

      const claimNextJob = (service as any).claimNextJob.bind(service);
      await claimNextJob();

      // Verify the WHERE clause has a specific ID
      const updateCall = mockPrismaService.downloadArtifact.updateMany.mock.calls[0][0];

      // The critical check: WHERE must include id
      expect(updateCall.where).toHaveProperty('id', 'artifact-1');

      // Also verify the status and workerToken conditions
      expect(updateCall.where.status).toBe(DownloadArtifactStatus.PENDING);
      expect(updateCall.where.workerToken).toBeNull();
    });
  });

  describe('recoverStuckJobs', () => {
    it('should recover stuck GENERATING jobs that have timed out', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago (past 5 min timeout)

      const stuckArtifact = {
        id: 'stuck-artifact',
        status: DownloadArtifactStatus.GENERATING,
        processingStartedAt: oldTime,
        workerToken: 'old-worker-token',
        retryCount: 0,
      };

      mockPrismaService.downloadArtifact.findMany.mockResolvedValue([stuckArtifact]);
      mockPrismaService.downloadArtifact.update.mockResolvedValue({
        ...stuckArtifact,
        status: DownloadArtifactStatus.PENDING,
        retryCount: 1,
      });

      const recoverStuckJobs = (service as any).recoverStuckJobs.bind(service);
      const recovered = await recoverStuckJobs();

      expect(recovered).toBe(1);
      expect(mockPrismaService.downloadArtifact.update).toHaveBeenCalledWith({
        where: { id: 'stuck-artifact' },
        data: expect.objectContaining({
          status: DownloadArtifactStatus.PENDING,
          processingStartedAt: null,
          workerToken: null,
          retryCount: 1,
        }),
      });
    });

    it('should mark as FAILED after max retries exceeded', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000);

      const stuckArtifact = {
        id: 'stuck-artifact',
        status: DownloadArtifactStatus.GENERATING,
        processingStartedAt: oldTime,
        workerToken: 'old-worker-token',
        retryCount: 3, // Already at max retries
      };

      mockPrismaService.downloadArtifact.findMany.mockResolvedValue([stuckArtifact]);
      mockPrismaService.downloadArtifact.update.mockResolvedValue({
        ...stuckArtifact,
        status: DownloadArtifactStatus.FAILED,
      });

      const recoverStuckJobs = (service as any).recoverStuckJobs.bind(service);
      await recoverStuckJobs();

      expect(mockPrismaService.downloadArtifact.update).toHaveBeenCalledWith({
        where: { id: 'stuck-artifact' },
        data: expect.objectContaining({
          status: DownloadArtifactStatus.FAILED,
        }),
      });
    });

    it('should not recover jobs that are not past timeout threshold', async () => {
      // No stuck jobs found
      mockPrismaService.downloadArtifact.findMany.mockResolvedValue([]);

      const recoverStuckJobs = (service as any).recoverStuckJobs.bind(service);
      const recovered = await recoverStuckJobs();

      expect(recovered).toBe(0);
      expect(mockPrismaService.downloadArtifact.update).not.toHaveBeenCalled();
    });
  });

  describe('poll - integration of claim and recover', () => {
    it('should recover stuck jobs before claiming new ones', async () => {
      // Mock recovery
      mockPrismaService.downloadArtifact.findMany.mockResolvedValue([]);

      // Mock claim
      mockPrismaService.downloadArtifact.findFirst.mockResolvedValue(null);

      const result = await service.poll();

      expect(result.recovered).toBe(0);
      expect(result.processed).toBe(0);

      // Verify findMany (recovery) was called before findFirst (claim)
      const findManyOrder = mockPrismaService.downloadArtifact.findMany.mock.invocationCallOrder[0];
      const findFirstOrder = mockPrismaService.downloadArtifact.findFirst.mock.invocationCallOrder[0];

      expect(findManyOrder).toBeLessThan(findFirstOrder);
    });
  });
});
