import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AuthorizationService } from '../auth/authorization.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        AuthorizationService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: CronofyService,
          useValue: {
            syncProjectToCalendar: jest.fn(),
            createEvent: jest.fn(),
            updateEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
