import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { OrgContextGuard } from '../auth/org-context.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { MediaService } from '../media/media.service';
import { AuthorizationService } from '../auth/authorization.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        ProjectsService,
        OrgContextGuard,
        AuthorizationService,
        Reflector,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: MediaService,
          useValue: {
            getMediaForProject: jest.fn(),
            createMediaForProject: jest.fn(),
            deleteMedia: jest.fn(),
          },
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

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
