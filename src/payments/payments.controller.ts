import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentDto, PaymentStatusDto } from './dto/payment.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.interface';

@ApiTags('Payments')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Generate/reuse the Paystack (sandbox) checkout for a reservation' })
  @ApiResponse({ status: 201, type: PaymentDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @HttpCode(HttpStatus.CREATED)
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto): Promise<PaymentDto> {
    return this.paymentsService.initiate(user.id, dto);
  }

  @Get(':rrr/status')
  @ApiOperation({
    summary: 'Poll payment status — checks Paystack live if still pending (no webhook)',
  })
  @ApiResponse({ status: 200, type: PaymentStatusDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getStatus(@CurrentUser() user: AuthUser, @Param('rrr') rrr: string): Promise<PaymentStatusDto> {
    return this.paymentsService.getStatus(user.id, rrr);
  }

  @Post(':rrr/simulate')
  @ApiOperation({
    summary: 'Offline fallback — resolve a payment without calling Paystack (demo/no-internet use)',
  })
  @ApiResponse({ status: 200, type: PaymentStatusDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  simulate(
    @CurrentUser() user: AuthUser,
    @Param('rrr') rrr: string,
    @Body() dto: SimulatePaymentDto,
  ): Promise<PaymentStatusDto> {
    return this.paymentsService.simulate(user.id, rrr, dto.outcome ?? 'success');
  }
}
