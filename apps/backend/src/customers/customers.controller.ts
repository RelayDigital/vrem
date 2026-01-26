import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Customers')
@ApiOrgScoped()
@Controller('customers')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({ summary: 'List customers (with optional search)' })
  @Get()
  list(@Req() req, @Query('search') search?: string) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.customersService.listForOrg(ctx, user, search);
  }

  @ApiOperation({ summary: 'Create a customer' })
  @Post()
  create(@Req() req, @Body() dto: CreateCustomerDto) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.customersService.create(ctx, user, dto);
  }

  @ApiOperation({ summary: 'Update a customer' })
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.customersService.update(ctx, user, id, dto);
  }

  @ApiOperation({ summary: 'Delete a customer' })
  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.customersService.delete(ctx, user, id);
  }
}
