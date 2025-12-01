import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentOrg } from '../organizations/current-org.decorator';
import { OrgMemberGuard } from '../organizations/org-member.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, OrgMemberGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  list(@CurrentOrg() org, @Query('search') search?: string) {
    return this.customersService.listForOrg(org.id, search);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  create(@CurrentOrg() org, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(org.id, dto);
  }
}
